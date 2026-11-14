# Clinic Platform — Plan

Status: **superseded in part by [REFACTOR_PLAN.md](REFACTOR_PLAN.md)** — the two briefs are merged there (Kysely instead of Drizzle, a database per tenant, add-ons). Sections on templates, the site editor, domains and white-label still apply. Not built yet.

This turns the single-clinic Orchid Dental Care site into one codebase and one deployment that serves many clinic websites. Each site must look like a standalone website built only for that client.

---

## 1. What exists today (summary of the code review)

| Area | Today | Fit for the platform |
| --- | --- | --- |
| Stack | SvelteKit 3 (Svelte 5), TypeScript, Tailwind 4, Drizzle (SQLite dialect), Zod | **Keep.** Runs on Workers and on Node. |
| Targets | `DEPLOY_TARGET=cloudflare\|node`. `#target` swaps D1 ⇄ better-sqlite3, D1-chunk ⇄ disk/S3 storage, Cache API ⇄ memory cache. | **Keep.** This is already the swap-out adapter layer the brief asks for. |
| Data | ~30 tables. No tenant concept. Unique keys are global (`slug`, `email`, `settings.key`). | Every tenant-owned table needs `tenant_id`. |
| Settings | Validated JSON groups (`clinic`, `theme`, `seo`, `homepage`, `booking`, `email`, …) in `settings(key)`. | Reuse them per tenant: `settings(tenant_id, key)`. |
| Content | Structured tables (locations, doctors, services, certifications, slides, pages) + generic `blocks` lists (intents, process, testimonials, FAQs, gallery, …). Homepage = ordered sections in `settings.homepage`. | Structured data stays. Homepage/page sections move to `tenant_pages`/`tenant_sections`. |
| Public site | `src/routes/(site)/*`. Server loaders fetch data; `+page.svelte` files hold the dental design. | Loaders stay in the platform; markup moves into `templates/dental/template-1`. |
| Admin | Full admin at `/admin` with roles `super_admin`, `clinic_admin`, `branch_staff`, audit log, media library, booking management. | Becomes the per-client **site editor**. A new super-admin app is added on a separate host. |
| Auth | PBKDF2 (Web Crypto), SHA-256 session ids, httpOnly host-only cookies, login rate limiting, password reset by email. | Good. Add `tenant_id` to users/sessions and bind each session to its tenant. |
| Extras | REST API + API keys, signed webhooks, integrations, chatbot, blog, CSP with nonces, page cache, sitemap/robots. | Keep everything, scoped per tenant. |
| Query sites | ~80 files, ~250 query call sites use `locals.db` directly. | The main isolation risk. See §3. |

### Hazards found

1. **`wrangler.toml` still points at the live Orchid production D1 database** (`database_id = bd745d43…`) and the worker name `clinic-site`. Running `npm run deploy:cf` from this repo would overwrite the live dental worker and run migrations against its database. Phase 1 changes both to a new worker and a new D1 database. Until then, **don't deploy from this repo.** The GitHub deploy workflow only runs if `DEPLOY_TO_CLOUDFLARE=true`, and that variable isn't set on the new repo.
2. **D1 free tier is 500 MB per database** (5 GB per account, 10 databases). Uploaded images currently live *inside* D1 (`media_chunks`). With every tenant in one database, all media shares those 500 MB. See decision D1.
3. **D1 free tier allows 50 queries per Worker invocation.** The homepage loader is about 15 queries today, and tenant + domain lookups add 1–2 more. That still fits, but the limit has to be watched.
4. Free-plan D1 daily limits (5 M rows read, 100 k written) are enforced as of 1 Sep 2026. The existing page cache keeps reads low. The cache key must now include the tenant.

---

## 2. Target architecture

```
                   ┌──────────────── one Worker (or one Node process) ────────────────┐
 Host header ──▶   │ hooks.server.ts                                                   │
                   │  1. resolveHost(host) → platform-admin | tenant | redirect | 404  │
                   │  2. 301 to the primary domain if host isn't primary               │
                   │  3. locals.tenant, locals.tdb (tenant-scoped DB), settings        │
                   │  4. session → must belong to locals.tenant                        │
                   │                                                                   │
                   │ routes/(site)/*   platform loaders  ──▶ template components      │
                   │ routes/admin/*    client site editor + bookings (per tenant)     │
                   │ routes/(platform)/* super admin — only on PLATFORM_ADMIN_HOST     │
                   └───────────────────────────────────────────────────────────────────┘
                          │ DB adapter (D1 / SQLite)   │ Storage adapter (R2 or D1 / disk / S3)
                          │ Cache adapter              │ Domain adapter (CF for SaaS / Caddy / manual)
```

### Keep the stack

SvelteKit + Drizzle + D1 fits. One small addition: a **domain-provider adapter** next to the existing storage/email/cache adapters:

- `cloudflare-saas`: the Cloudflare for SaaS custom-hostnames API.
- `caddy`: on-demand TLS with an `ask` endpoint, for the later dedicated server.
- `manual`: you add hostnames yourself.

### One shared database with `tenant_id`, not one database per tenant

One database per tenant isn't possible on the free tier. You get 10 databases, and D1 bindings are fixed at deploy time, so a Worker can't open a new tenant's database without a redeploy. One shared schema with `tenant_id` on every row is the standard approach. It also moves cleanly to Postgres later, where row-level security can be added.

---

## 3. Tenant isolation (enforced on the server)

Isolation must not depend on every one of ~250 query sites remembering a `WHERE tenant_id = ?`. So:

1. **`tenant_id NOT NULL` on every tenant-owned table**, including join tables (`doctor_locations`, `service_doctors`, …) and child tables (`appointment_notes`, `webhook_deliveries`, …). Denormalising this keeps the guard simple, because every row can be checked without a join.
2. **Composite foreign keys / uniques include the tenant.** Examples: `UNIQUE(tenant_id, slug)` and `UNIQUE(tenant_id, email)`. Where SQLite allows it, child foreign keys are `(tenant_id, parent_id) → parent(tenant_id, id)`, so a row can't point at another tenant's parent even if a bug passes a foreign id.
3. **A tenant-scoped DB handle `locals.tdb`** (`src/lib/server/tenant-db.ts`):
   - `tdb.select(...).from(table)` always adds `table.tenant_id = <tenant>`.
   - `tdb.insert(table).values(v)` always sets `tenant_id`, overwriting any value passed in.
   - `tdb.update(table)` and `tdb.delete(table)` always AND the tenant condition into the `WHERE`.
   - It refuses tables that aren't registered as tenant-owned or explicitly global.
4. **Raw `db` is off-limits in feature code.** Only `tenant-db.ts`, the host resolver, auth and `src/lib/server/platform-admin/**` may import it. A unit test scans `src/` and fails CI if a route or a `lib/server` module uses `locals.db`/`getDb` outside that allow-list.
5. **Isolation tests (Vitest + Playwright) with two seeded tenants.** For each admin and API endpoint, the test asks for a record that belongs to the other tenant: by id, by slug, by booking reference and by media key. It expects a 404. The tests also check that a session cookie minted on host A is rejected on host B, and that an API key from tenant A gets a 401 on tenant B.
6. **Media keys are tenant-prefixed in storage** (`t/<tenantId>/2026/11/<random>.webp`). The public URL is just `/media/<random>.webp`. The `/media` route looks up `(tenant_id, public_key)`, so tenant B's host can't serve tenant A's files.
7. **Caches are keyed by tenant:** `/<tenantId>/<contentVersion>/<path>`.

---

## 4. Data model (`/migrations`)

The platform gets a **fresh D1 database** (decision D5), so the schema starts from a clean baseline `migrations/0000_platform.sql`. `drizzle.config.ts` and `wrangler.toml` point at `/migrations`, and the old `drizzle/` folder is removed. Existing table names stay where the meaning is the same, to keep churn low: **locations = branches** and **appointments = bookings**.

### Platform tables (global)

| Table | Columns (main) |
| --- | --- |
| `categories` | id, slug (`dental`), name, description, enabled, sort_order |
| `templates` | id, category_id, key (`dental/template-1`), name, version, enabled, manifest_hash, registered_at |
| `tenants` | id, slug (internal only, never in public URLs), name, status `draft\|active\|suspended`, category_id, template_id, published_at, created_at |
| `domains` | id, tenant_id, hostname UNIQUE, kind `subdomain\|custom`, mode `serve\|redirect`, is_primary, status `pending\|verifying\|active\|failed`, ssl_status, provider_ref (CF custom-hostname id), verification JSON (TXT/CNAME records), last_checked_at |
| `platform_users` | super admins: id, email, name, password_hash, … (separate from client users, so a client account can never become super admin) |
| `platform_sessions`, `platform_audit_log` | as today, for the super-admin host |
| `rate_limits` | global, keys namespaced `t:<tenant>:…` |

### Tenant tables (all with `tenant_id`)

| Table | Notes |
| --- | --- |
| `settings` | PK `(tenant_id, key)`; columns `draft`, `published`. This holds theme (logo, colours, fonts, favicon), SEO defaults, contact details, labels, booking, email, etc. — the existing Zod groups. |
| `tenant_pages` | page_key, kind (`home\|about\|services\|doctors\|branches\|gallery\|testimonials\|faq\|contact\|book\|blog\|custom`), path, title, enabled, sort_order, seo JSON, `draft`/`published` JSON |
| `tenant_sections` | page_key, section_key, type, enabled, sort_order, `draft_content` JSON, `published_content` JSON |
| `tenant_content_archive` | content from a previous template whose keys had no match in the new one, kept so switching back restores it |
| `users` | tenant_id, email (UNIQUE per tenant), role `client_admin\|client_staff`, optional branch restriction (`user_locations`) |
| `sessions`, `password_resets`, `audit_log` | tenant_id added. A session is valid only on its tenant's hosts. |
| `locations`, `location_closures`, `doctors`, `doctor_locations`, `doctor_leaves`, `services`, `service_locations`, `service_doctors`, `certifications`, `slides`, `blocks` (testimonials, FAQs, gallery, intents, …), `pages` (custom pages + blog) | existing tables, tenant_id added, uniques made per tenant |
| `appointments`, `appointment_notes`, `messages` | bookings and contact inbox; references are unique per tenant |
| `media`, `media_chunks` | `public_key` (random, unique per tenant) and a tenant-prefixed storage key |
| `api_keys`, `webhooks`, `webhook_deliveries` | tenant_id added |

### Draft vs published

- **Draft/published:** pages, sections, theme and settings have separate `draft` and `published` columns. "Publish" copies draft → published in a single D1 `batch()`, then bumps the tenant's content version, which purges that tenant's page cache.
- **Structured records** (doctors, services, branches, testimonials, gallery, FAQs) are live as soon as they're saved, but each has a *visible* toggle. Full draft copies of every record would roughly double the schema and the editor work. See decision D4.
- **Preview** is a button in the editor. It sets a short-lived, signed, httpOnly preview cookie on the tenant's own domain. Public routes then render draft content for that browser only. Preview responses are never cached, and they get a `noindex` header.

---

## 5. Tenant resolution and domains

- **Host lookup:** `hostname → domains row → tenant`. The result is cached in isolate memory for 60 s, and the cache is invalidated when the tenant's version changes.
- **Hostnames:**
  - `PLATFORM_ADMIN_HOST` (e.g. `console.<your-domain>`) serves only the super admin.
  - `*.PLATFORM_BASE_DOMAIN` gives each tenant a default subdomain.
  - Any active custom domain serves its tenant.
  - Anything else gets a blank 404 with no branding and no body text naming the platform.
- **Primary domain:** exactly one per tenant (enforced by a partial unique index). Every request on a non-primary host (other customs, `www`/apex variant, the shared subdomain) gets a **301 to the same path on the primary**, so the shared subdomain never shows up in search results or the address bar once a custom domain is live.
- **Status:**
  - `suspended`: a neutral 503 "This site is temporarily unavailable". The page has no platform name and no clinic content, and the response is `noindex`.
  - `draft`: reachable only through preview or by a logged-in client admin.
- **Custom domains (serve mode)** use Cloudflare for SaaS custom hostnames:
  1. Super admin adds `www.clinic.com`.
  2. The platform calls the CF API (`POST /zones/:zone/custom_hostnames`, DV certificate over HTTP or TXT validation) and stores the returned records.
  3. The client creates `CNAME www → sites.<your-domain>` (the fallback origin) plus any TXT record shown.
  4. The super admin "Check now" button, plus the cron job, poll the status until it's active. A manual setting can then make it primary.
  - **Checked limits (Nov 2026):** 100 custom hostnames are included on the Free plan, then $0.10/hostname/month, up to 50,000. Your zone (`<your-domain>`) must be on Cloudflare, and the Worker is attached to it with a `*/*` route so custom hostnames reach it.
- **Apex domains (`clinic.com`):**
  - Proxying an apex domain with a CNAME needs the client's DNS host to support CNAME flattening/ALIAS. Static apex IPs on Cloudflare for SaaS are an Enterprise feature.
  - The recommended setup is `www` as the served primary, with the apex added in **redirect mode**: it points at us and we 301 it to `www`.
  - If their DNS can do neither, they use their registrar's URL forwarding to `www`. The editor shows the exact records for each case and their live status.
- **Redirect mode (fallback):** a domain we receive traffic for but never serve content on. It always 301s to the primary. This covers old domains, apex variants, and typo domains.
- **Dedicated server later:** the `caddy` domain adapter does the same job with Caddy on-demand TLS. Caddy's `ask` URL checks the `domains` table before issuing a certificate.
- **Local development:**
  - Browsers resolve `*.localhost` to 127.0.0.1 with no hosts-file edits, so you can use `orchid.localhost:5173`, `demo.localhost:5173` and `console.localhost:5173`.
  - For `wrangler dev` the same works on port 8787.
  - A seed option adds `orchid.test`/`demo.test` entries for people who prefer hosts files.

---

## 6. Template system

### Layout on disk

```
templates/
  dental/
    category.json                  { "slug": "dental", "name": "Dental Clinic" }   (optional default)
    template-1/
      manifest.json
      Layout.svelte                header, footer, mobile bar, banner
      sections/Hero.svelte, Intents.svelte, Services.svelte, Doctors.svelte, …
      pages/DoctorDetail.svelte, ServiceDetail.svelte, BranchDetail.svelte, Book.svelte, …  (optional overrides)
      sample/images/*.webp|svg     sample images, copied into the tenant's media when seeding
  eye/
    template-1/ …
```

### `manifest.json`

```jsonc
{
  "key": "dental/template-1",
  "category": "dental",
  "name": "Dental — Template 1",
  "version": 1,
  "theme": { "primary": "#0a7d8c", "headingFont": "Fraunces", "bodyFont": "DM Sans", "radius": "soft" },
  "pages": [
    {
      "key": "home", "kind": "home", "path": "/", "title": "Home",
      "sections": [
        {
          "key": "hero", "type": "Hero", "label": "Hero slideshow",
          "fields": [
            { "key": "slides", "type": "list", "label": "Slides", "item": [
              { "key": "image", "type": "image", "label": "Image", "required": true },
              { "key": "heading", "type": "text", "label": "Heading", "max": 120 },
              { "key": "button", "type": "link", "label": "Button" }
            ]},
            { "key": "showArrows", "type": "toggle", "label": "Show arrows" }
          ],
          "sample": { "slides": [ { "image": "sample/images/hero-1.svg", "heading": "Gentle dentistry for the whole family", "button": { "text": "Book a visit", "href": "/book" } } ], "showArrows": true }
        },
        { "key": "doctors", "type": "Doctors", "label": "Our dentists", "source": "doctors",
          "fields": [ { "key": "heading", "type": "text", "label": "Heading" }, { "key": "limit", "type": "number", "label": "How many" } ],
          "sample": { "heading": "Experienced hands, kind hearts", "limit": 8 } }
      ]
    },
    { "key": "doctors", "kind": "doctors", "path": "/doctors", "title": "Our Dentists", "sections": [ … ] }
  ],
  "sampleData": {
    "branches": [ … ], "doctors": [ … ], "services": [ … ],
    "testimonials": [ … ], "gallery": [ … ], "faqs": [ … ]
  }
}
```

- **Field types:** `text`, `textarea`, `richtext`, `image`, `list` (with `item` fields), `colour`, `toggle`, `link`, `number`, `select`, `icon`.
- **Validation:** a single Zod schema validates the manifest at build time and in the super admin. The same field schema generates the editor forms and validates saved content. The existing `collections.ts` form generator is reused.
- **Data sources:** a section with `"source": "doctors"` renders structured data. Its own fields only control headings and display options.
- **Templates are folders, discovered at build time:** `import.meta.glob('/templates/*/*/manifest.json')` and `import.meta.glob('/templates/*/*/**/*.svelte')`.
  - **Adding a template means dropping in a folder, committing, redeploying, then clicking "Register / enable" in the super admin.** No other code changes are needed.
  - A redeploy is unavoidable. Workers can't compile Svelte at runtime, so templates can't be uploaded as zip files through the browser.
- **Categories are DB rows** you add in the super admin at any time. A template whose category doesn't exist yet appears as "needs category". You create the category and the template attaches to it.

### How a page renders

The SvelteKit routes under `routes/(site)` stay platform-owned. They handle loaders, booking logic, validation, SEO and JSON-LD. Each `+page.svelte` becomes a thin `<TemplatePage>` that:

1. picks the tenant's template, then
2. renders `Layout` and the page's enabled sections in the saved order, giving each section its content plus its data source.

Templates only do presentation. They can reuse the shared building blocks in `src/lib/components/site/*` (booking form, map tabs, hours table, …), so a new template doesn't reimplement booking.

### Assigning and switching templates

- **Assign:** seed `tenant_pages`, `tenant_sections`, theme and structured data from the manifest's `sample` and `sampleData`. Sample images are copied into the tenant's media, so they're served from `/media/…` on the tenant's domain like any upload.
- **Switch within a category:** for each new section, content is copied field by field where `(page_key, section_key, field_key)` matches. Unmatched fields get the new template's sample values. Old fields with no match go to `tenant_content_archive`. Structured data (doctors, services, branches, bookings, …) is template-independent and never touched. The switch goes to **draft** only, so the client previews it before publishing.

### Dental → Template 1 (the current site)

- The current `(site)` markup and homepage sections move into `templates/dental/template-1` as-is.
- Template sections map to the existing homepage sections: `hero, intents, services, process, doctors, locations, certifications, technology, amenities, testimonials, insurance, membership, faq, cta`.
- The current defaults become the manifest's sample values.
- **"Looks unchanged" is verified by Playwright screenshots.** Before any change, baseline full-page screenshots are captured of about 12 pages at mobile and desktop widths, on the current single-tenant build. The same pages on `orchid.localhost` must match with pixel diff ≤ 0.1%. These baselines are committed in Phase 1, step 1.
- `docs/ADDING_TEMPLATES.md` documents: copy a template folder → edit the manifest → build → register in the super admin.

---

## 7. Super admin (separate hostname)

Lives at `routes/(platform)` and only answers on `PLATFORM_ADMIN_HOST`. It uses its own `platform_users`/sessions and its own cookie.

- **Clients:** list/search, add (name, category → template, default subdomain auto-suggested from the name), edit, suspend/reactivate, delete.
  - Delete is a soft delete with 30-day purge, and needs the client's name typed to confirm.
- **Client detail:** status, template, primary domain, users (invite / reset password), recent bookings count.
  - **"Open site editor"** sends a single-use token (60 s, signed) to `https://<tenant-primary>/admin/sso`. That page creates a normal session on the client's domain, marked `impersonated_by`, and the audit log records it.
  - The client never sees a link back to the platform.
- **Categories and templates:** add/rename categories. "Discovered templates" from the build can be registered/enabled, with a manifest validation report and a preview using sample data.
- **Domains:** per tenant, add/remove hostnames, set the primary, choose serve/redirect. Each domain shows:
  - DNS instructions (records to create, with copy buttons),
  - live verification and SSL status,
  - a "Check now" button.

---

## 8. Client admin and site editor (on the client's own domain)

The existing `/admin`, now scoped per tenant:

- **Login page:** the tenant's logo, colours, favicon and name. No platform name.
- **Pages and sections:**
  - turn pages on/off and drag to reorder them;
  - drag to reorder sections and show/hide them;
  - edit section content with forms generated from the template's field schema;
  - **Preview** and **Publish** buttons, plus a "Discard draft" option.
- **Structured data:** doctors, services, branches (address, map, timings, phones, closures), testimonials, gallery, FAQs, certifications, slides. The existing editors are reused.
- **Theme:** logo, colours, fonts, favicon, sizes. These are draft until published. The existing live-preview branding page is reused.
- **Media:** a per-tenant library, served at `/media/<key>` on the tenant's domain.
- **Bookings:** list, calendar, detail, status, notes, CSV export, filter by branch.

### Roles

| Role | Where | Can |
| --- | --- | --- |
| Super admin | console host only (+ SSO into any tenant) | everything |
| Client admin | own domain `/admin` | own site editor, theme, media, users (staff), bookings |
| Client staff | own domain `/admin` | bookings only, optionally limited to some branches |

The settings that are super-admin-only today (email provider, integrations, API keys, chatbot) stay super-admin-only and are reached through SSO.

### Auth hardening

- Cookies are host-only. They have no `Domain` attribute, which scopes them to one hostname, and use `__Host-` prefix, `Secure`, `HttpOnly` and `SameSite=Lax`.
- Session rows store `tenant_id` and are rejected on any other tenant.
- Login rate limiting is per IP + per tenant + email.
- Reset emails are sent with the clinic's name.

---

## 9. White-label checklist (Phase 4 makes these automated tests)

A Playwright check crawls each test tenant and fails on any of these:

- the platform name, the base domain, or another tenant's name/slug/id in HTML, headers, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, JSON-LD, error pages, 404, suspended page or emails (captured with a test email provider);
- HTML comments in output, `x-powered-by`, or extra `x-*` headers (the current `x-cache` debug header is removed);
- `console.*` output in the browser;
- any `<link>`/`<img>`/`<script>` pointing at a shared bucket or another host, beyond Google Fonts/Maps/Turnstile/GA, which any standalone site uses too.

Per tenant, generated from its data: `<title>`, meta, OG/Twitter tags, canonical URL (primary domain), favicon (`/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png` served from tenant media), web manifest, `sitemap.xml` and `robots.txt`.

- **Emails/SMS:** the From display name is the clinic's name, Reply-To is the clinic's email, and the footer and links point to the clinic's domain. See decision D6 for the sending address.
- **Turnstile:** a single platform widget would need every tenant hostname listed on it, so keys are set per tenant. The existing setting already supports per-tenant keys.
- **Residual sameness that can't be removed in one deployment:** all tenants share the same `/_app/immutable/*.js` file names and Cloudflare's standard `server`/`cf-ray` headers. These aren't branded, and millions of unrelated sites look the same, but someone comparing two client sites' JS file hashes could tell they share code. If that matters later, per-template builds or obfuscated chunk names can reduce it.

---

## 10. Seeding and Orchid migration

- `npm run seed`: creates the categories/templates, a super admin, and then two tenants.
  - **Orchid Dental Care** on Dental → Template 1, with the current site's content (source: decision D3), primary `orchid.localhost` locally.
  - **Demo Dental**, which uses only the template's sample data, on `demo.localhost`.
- `npm run import:tenant -- --from=<d1-export.sql> --tenant=orchid`: imports a single-clinic database (the current schema) into a tenant. It adds `tenant_id`, re-keys media and copies uploads. This is also the tool for onboarding any other client that runs the old single-site version.
- The **live Orchid site keeps running untouched** from the old DentalClinic repo/worker until you choose to cut over by pointing its domain at the platform.

---

## 11. Phases

Each phase ends with:

- `npm run check`, unit tests and e2e passing;
- a local run with two tenants on different hostnames (`npm run dev`, then `npm run preview:cf` for the Worker build);
- a commit and push to `main`.

| Phase | Deliverables |
| --- | --- |
| **1. Foundation** | Baseline screenshots of the current site • new worker name + empty D1 id in `wrangler.toml` • `/migrations` with the platform schema • `tenant-db` scoped handle + raw-db lint test • host resolution + primary redirect • queries/loaders/admin moved to `tdb` • templates loader + manifest schema • **Dental Template 1** extracted • seed with Orchid + Demo • screenshot diff passes • isolation tests for public routes |
| **2. Super admin** | console host, platform users, clients CRUD + suspend/delete, categories, template registration, domains list (manual provider), SSO into a tenant |
| **3. Client admin + editor** | tenant-scoped login/reset with tenant branding, roles (client admin/staff), pages/sections editor from field schema, theme editor, draft/preview/publish, per-tenant media, per-tenant bookings filterable by branch, full isolation test suite for admin + API |
| **4. Domains + white-label** | Cloudflare for SaaS adapter (+ Caddy adapter stub), DNS instructions + verification polling, redirect mode, primary-domain 301s, per-tenant favicon/manifest/OG/sitemap/robots, email branding, white-label crawler test |
| **5. Extensibility proof** | Dental → Template 2 (a visibly different design using the same field keys where it makes sense, to exercise switching) and Eye Clinic → Template 1, both added **only** as folders + registration; `docs/ADDING_TEMPLATES.md` validated by following it |

The README is updated in every phase. It covers setup, environment variables (`PLATFORM_ADMIN_HOST`, `PLATFORM_BASE_DOMAIN`, `CF_SAAS_ZONE_ID`, `CF_API_TOKEN`, `SAAS_FALLBACK_HOST`, …), multi-hostname local dev, and Cloudflare deploy.

---

## 12. Decisions needed from you (before Phase 1)

| # | Decision | My recommendation |
| --- | --- | --- |
| **D1** | **Where uploaded media lives on Cloudflare.** D1 chunks (as now) share one 500 MB database across *all* clients, and that cap also holds all other data. R2 has 10 GB free and no egress fees, but enabling it requires a payment method on the Cloudflare account. | **R2.** Files are still served through the Worker at `/media/…` on each tenant's own domain, so nothing changes publicly. Keep the D1 driver as a fallback for accounts without R2. |
| **D2** | **Your platform domain(s):** the base domain for default subdomains, the super-admin hostname, and the CNAME target clients point at. It must be a zone on your Cloudflare account. | A neutral domain that isn't your agency's brand (e.g. `sites-host.net`), with `console.` for the super admin and `sites.` as the CNAME target. The name never appears publicly once a client's custom domain is primary, but it shows in DNS records. |
| **D3** | **Where Orchid's content comes from:** a read-only `wrangler d1 export` of the live production database (real current content, edits included), or the `dental` seed profile in this repo (may be out of date). | **Live export (read-only).** I would run `wrangler d1 export` against the production DB — it only reads. I'll ask before running it. |
| **D4** | **Draft/publish scope:** pages, sections, theme and settings only (structured records get a visible toggle), *or* full drafts for every record too. | **Pages/sections/theme/settings.** Full record drafts add a lot of work for little gain; it can be added later. |
| **D5** | **Fresh D1 database and new worker name** for the platform (e.g. `clinic-platform`, `clinic-platform-db`), leaving the live Orchid worker/database alone. | **Yes.** |
| **D6** | **Email sending address.** Sending from one platform domain puts that domain in every From address. Options: (a) each client verifies their own domain with the email provider, (b) one neutral sender domain you own, with the clinic name as display name and the clinic as Reply-To, (c) a mix: (b) by default, (a) when a client wants it. | **(c).** Per-tenant email provider settings already exist in the code. |
| **D7** | **Existing extras** (REST API, webhooks, integrations, chatbot, blog, certifications): keep them all, scoped per tenant, or drop some to reduce scope. | **Keep**, scoped per tenant. They're already built and the work is mostly adding `tenant_id`. |

Once you approve (with answers to D1–D7), I start Phase 1.
