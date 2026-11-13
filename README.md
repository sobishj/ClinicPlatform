# Clinic Website (white-label)

The official website for a clinic, managed from an admin panel: who the clinic is, its branches, doctors, services and certifications — with a simple, reliable appointment-request feature. One codebase serves any kind of clinic (dental, eye, skin, physiotherapy, general practice) by changing settings and content only.

First client: **Orchid Dental Care**.

- **Stack:** SvelteKit 3 (Svelte 5 runes), TypeScript strict, Tailwind CSS 4, Drizzle ORM (SQLite dialect), Zod
- **Runs on:** Cloudflare Workers free tier (D1 + R2 + Turnstile) **or** any Linux server (Docker: Node + SQLite + local disk/S3 + Caddy)
- **Same code for both:** `DEPLOY_TARGET=cloudflare|node` picks the adapter and platform module at build time

All six build phases are complete — see [Build phases](#build-phases).

## Contents

- [Quick start](#quick-start-local-no-cloudflare-account-needed)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Deploy to Cloudflare (free tier)](#deploy-to-cloudflare-free-tier)
- [Deploy to a dedicated server](#deploy-to-a-dedicated-server-docker)
- [Moving between Cloudflare and a server](#moving-between-cloudflare-and-a-server)
- [Setting up a new clinic](#setting-up-a-new-clinic)
- [API, webhooks and integrations](#api-webhooks-and-integrations)
- [Chatbot](#chatbot)
- [Architecture](#architecture)
- [Security](#security)
- [Testing and quality](#testing-and-quality)
- [Build phases](#build-phases)

---

## Quick start (local, no Cloudflare account needed)

Requirements: Node 20.19+ (22 recommended).

```bash
npm install
npm run seed -- --profile=dental            # demo content → ./data/clinic.db
npm run create-admin -- --email=you@example.com --password='a-long-password'
npm run dev                                  # http://localhost:5173  (admin: /admin)
```

Or skip `create-admin` and open `/admin`: with no users you are sent to a one-time setup screen.

Seed profiles: `dental`, `eye`, `skin`, `general`, `physio`, `other` (add `--name="Clinic Name"`). Re-seeding replaces content but keeps users, API keys and webhooks. Demo images are neutral illustrations in `static/demo/` — replace them with real photos through the media library. Demo branches, doctors and phone numbers are fictional; real data is entered through the admin panel.

> `.npmrc` sets `legacy-peer-deps=true` because npm's peer resolver currently crashes on this dependency tree.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, local SQLite + local disk storage |
| `npm run build:node` / `npm start` | Build and run the Node server (`build/`) |
| `npm run build:cf` | Build the Cloudflare Worker (`.svelte-kit/cloudflare`) |
| `npm run preview:cf` | Build for Cloudflare and run it locally with `wrangler dev` (local D1/R2) |
| `npm run deploy:cf` | Build, apply D1 migrations, deploy to Cloudflare |
| `npm run seed -- --profile=dental` | Load demo content (`--sql=seed.sql` writes SQL for D1 instead) |
| `npm run create-admin -- --email=…` | Create/reset a super admin (`--role=clinic_admin\|branch_staff`, `--sql=admin.sql` for D1) |
| `npm run db:generate` | New migration after editing `src/lib/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the local SQLite file (the server also does this on start) |
| `npm run db:migrate:d1` / `db:migrate:d1:local` | Apply migrations to remote / local D1 |
| `npm run migrate:data -- from-cloudflare\|to-cloudflare` | Move data between D1 + R2 and SQLite + disk |
| `npm run backup` | One backup now (`deploy/backup.sh once`) |
| `npm run check` | Type-check (svelte-check) |
| `npm run test:unit` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end + accessibility tests (Playwright, own seeded database) |

## Environment variables

**All are optional.** The full documented list is in [`.env.example`](.env.example). Values set in the environment override the matching admin settings.

| Variable | Used for |
| --- | --- |
| `DEPLOY_TARGET` | Build time: `node` (default) or `cloudflare` |
| `ORIGIN` | Public URL (Node behind a proxy; needed for CSRF checks) |
| `DATABASE_PATH`, `MIGRATIONS_DIR` | SQLite file and migrations folder (Node) |
| `STORAGE_DRIVER`, `UPLOAD_DIR`, `S3_*` | Local disk (default) or any S3-compatible bucket (Node) |
| `MEDIA_PUBLIC_BASE_URL` | Serve media from a public bucket/custom domain instead of `/media` |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `SMTP_*` | Email (Resend works everywhere; SMTP on Node only) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Spam protection on booking/contact forms |
| `CRON_SECRET` | Bearer token for `POST /api/internal/cron` (webhook retries, cleanup) |
| `SETUP_TOKEN` | Protect the first-run `/admin/setup` screen |

On Cloudflare, plain values go in `wrangler.toml` `[vars]`; secrets with `npx wrangler secret put NAME`.

---

## Deploy to Cloudflare (free tier)

Uses Workers (with static assets), D1 (SQLite), R2 (files) and Turnstile — all within free limits for a clinic site.

### One-time setup

```bash
npx wrangler login
npx wrangler d1 create clinic-db              # copy the database_id into wrangler.toml
npx wrangler r2 bucket create clinic-media
npm run db:migrate:d1                          # create tables in D1

# Content and first admin (or use /admin/setup after the first deploy)
npm run seed -- --profile=dental --sql=seed.sql
npx wrangler d1 execute clinic-db --remote --file=seed.sql
npm run create-admin -- --email=you@clinic.com --sql=admin.sql
npx wrangler d1 execute clinic-db --remote --file=admin.sql

# Optional secrets
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put CRON_SECRET

npm run deploy:cf
```

To test the Worker build locally first: `npm run db:migrate:d1:local`, run the two `d1 execute` commands with `--local` instead of `--remote`, then `npm run preview:cf` (http://localhost:8787).

### Automatic deploys from GitHub

Pick one:

- **GitHub Actions** (included): `.github/workflows/deploy-cloudflare.yml` builds, applies D1 migrations and deploys on pushes to `main`. Add repository secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers", plus D1 edit permission) and `CLOUDFLARE_ACCOUNT_ID`. Deploys are opt-in: set the repository variable `DEPLOY_TO_CLOUDFLARE=true` (Settings → Secrets and variables → Actions → Variables) once the secrets are added and `wrangler.toml` has your real D1 `database_id`.
- **Cloudflare Workers Builds**: Dashboard → Workers & Pages → your worker → Settings → Build → connect the GitHub repo. Build command `npm run build:cf`, deploy command `npx wrangler d1 migrations apply clinic-db --remote && npx wrangler deploy`.

`.github/workflows/ci.yml` runs type-checks, unit tests, both builds and the Playwright suite on every pull request.

### Custom domain

Dashboard → Workers & Pages → `clinic-site` → Settings → Domains & Routes → **Add custom domain** (e.g. `www.orchiddental.in`). The domain must use Cloudflare DNS; certificates are automatic. Add a redirect rule from the apex to `www` (or the reverse) if you use both.

### Webhook retries on Cloudflare

Deliveries are attempted immediately in the background and retried opportunistically while staff use the admin panel. For guaranteed retries, call `POST /api/internal/cron` every ~10 minutes with `Authorization: Bearer $CRON_SECRET` — from a small Cron Trigger worker, cron-job.org, or a scheduled GitHub Action.

### Staying in the free tier

- Public pages and `__data.json` are cached with the Cache API under a content-version key that changes on every edit (that is the "purge on change"), so most visits never touch D1.
- Images are resized and converted to WebP **in the browser** before upload — no server image processing.
- Admin lists are paginated; rate-limit and session tables are cleaned by the cron endpoint.

---

## Deploy to a dedicated server (Docker)

```bash
git clone <repo> clinic && cd clinic
cp .env.example .env      # set DOMAIN=www.example.com, plus any email/Turnstile/CRON_SECRET values
docker compose up -d --build
docker compose exec app npx tsx scripts/seed.ts --profile=dental      # optional demo content
docker compose exec app npx tsx scripts/create-admin.ts --email=you@clinic.com
```

`docker-compose.yml` runs:

| Service | Purpose |
| --- | --- |
| `app` | Node build (`adapter-node`), SQLite + uploads in the `clinic-data` volume, migrations applied on start, health check |
| `caddy` | Reverse proxy with automatic HTTPS (Let's Encrypt) for `$DOMAIN`, compression, `www` redirect ([`deploy/Caddyfile`](deploy/Caddyfile)) |
| `backup` | Daily at `$BACKUP_HOUR` (default 02:00): consistent SQLite snapshot (online `.backup` + integrity check, gzipped) and uploads archive into `./backups`, keeping `$BACKUP_KEEP_DAYS` (14) days |
| `cron` | Calls the housekeeping endpoint every 10 minutes when `CRON_SECRET` is set |

Restore: stop `app`, `gunzip` a backup to `clinic.db` inside the volume, extract the uploads archive, start `app`.

Without Docker: `npm ci && npm run build:node`, then run `node build` under systemd with the environment variables above, behind Caddy or nginx. Set `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1` so rate limiting sees real client IPs.

## Moving between Cloudflare and a server

```bash
# R2 S3-API credentials (Cloudflare dashboard → R2 → Manage API tokens)
export R2_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com R2_BUCKET=clinic-media
export R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=…

npm run migrate:data -- from-cloudflare --db=./data/clinic.db --uploads=./data/uploads   # D1 + R2 → server
npm run migrate:data -- to-cloudflare   --db=./data/clinic.db --uploads=./data/uploads   # server → D1 + R2
```

The database moves with `wrangler d1 export/execute` (an existing local file is copied aside first); files move over R2's S3 API. `--skip-db` / `--skip-files` move one part; `--local` targets wrangler's local D1 (useful for a dry run). Media URLs (`/media/uploads/…`) are identical on both targets, so no content rewriting is needed. Inside Docker: `docker compose exec app npx tsx scripts/migrate-data.ts …`.

---

## Setting up a new clinic

1. Seed the closest profile (`--profile=eye`, `skin`, …) or start empty.
2. **Settings → Clinic & branding:** name, logo, colours, fonts (live preview), phones, WhatsApp, social links, time zone.
3. **Settings → Type, labels & modules:** clinic type (drives structured data), wording ("Dentists", "Treatments"), and which sections exist at all.
4. **Locations** (paste the Google Maps share link or "Embed a map" code), then **Doctors** (photos with crop; branches with a weekly schedule each), **Services**, **Certifications**.
5. **Hero slides**, **Homepage** (drag sections, edit headings), **Content blocks** (FAQs, testimonials, intent cards…), **Pages & blog** (about, privacy, terms).
6. **Settings → Booking / Notifications & email / SEO, analytics & spam**, then **Users**.

### Roles

| Role | Can do |
| --- | --- |
| Super admin | Everything, including settings, users, integrations |
| Clinic admin | All content, colours & branding, and all appointments |
| Branch staff | Appointments for their assigned branch(es) only; content read-only |

Every admin load/action checks permissions on the server; `hooks.server.ts` also blocks unauthenticated `/admin/*`. All changes are written to the **audit log**.

### Booking

- **Request mode (default):** branch → doctor (optional, "No preference") → day + morning/afternoon/evening (only days the branch, and the chosen doctor, are open) → details + DPDP consent + Turnstile → thank-you with reference and call/WhatsApp/directions. Steps are skipped when there is only one branch or when pre-filled from a doctor, branch or service page (`/book?location=&doctor=&service=`). Works without JavaScript as a single form.
- **Live slots (optional):** clinic-wide or per branch. Slots come from each doctor's per-branch schedule minus leave, closures, existing bookings and minimum notice; slot length per clinic or per service. Re-checked on submit, and a partial unique index on (doctor, slot) prevents double booking at the database level. `.ics` download on the thank-you page. Times are stored in UTC and shown in the clinic time zone.
- **After a request:** status `new → confirmed / rescheduled / completed / cancelled / no-show`, notes history, one-tap call and WhatsApp (editable template), add requests taken by phone, CSV export, week calendar. Optional emails to the branch and patient; optional WhatsApp Cloud API and SMS.
- Rate limits per IP and per phone number (configurable).

---

## API, webhooks and integrations

- **REST API** at `/api/v1`, documented in OpenAPI 3.1 at **`/api/v1/openapi.json`** (linked from Admin → Integrations & API).
  - Read (`read` scope): `/site`, `/locations`, `/doctors?location=`, `/services`, `/faqs`, `/availability?location=&doctor=&date=`
  - Write: `POST /appointments` (`appointments:create`; same validation as the form; `consent: true` required)
  - Admin: `GET/PATCH /appointments[/{id|reference}]` (`appointments:read|write`), `PATCH /locations|doctors|services/{slug}` (`content:write`)
  - Keys: created in admin, shown once, stored as SHA-256, scoped, revocable, last-used tracked, 600 requests per 10 minutes each. CORS allow-list for browser callers.
- **Webhooks:** `appointment.created|updated|cancelled`, `doctor.updated`, `location.updated`. Body `{ id, event, createdAt, data }`, header `X-Webhook-Signature: t=<unix>,v1=<hex>` with `v1 = HMAC-SHA256(secret, "<t>.<raw body>")` (reject timestamps older than 5 minutes). Retries with backoff (1 m, 5 m, 30 m, 2 h, 12 h), delivery log with payloads, "send test" and "retry now".
- **Integration adapters** (`src/lib/server/integrations/`): the `IntegrationProvider` interface (`syncAppointment`, `fetchAvailability`, `pushPatient`, `sendNotification`) with a no-op default and a **generic HTTP bridge** example. To add a system, copy `providers/generic-http.ts`, map the vendor's API, and register it in `registry.ts`; it then appears in the admin. If a provider returns availability, live slots use it instead of local schedules.
- **Notification channels** (`integrations/channels.ts`): email, WhatsApp Business Cloud API (approved template), and SMS via any JSON-webhook gateway — each optional.

## Chatbot

Off by default (Settings → Chatbot):

- **Third-party widget:** paste the vendor snippet. Only `<script>` tags are used and external scripts must be https. Scripts load after the first interaction (or 6 s), only on the public site; their origins and SHA-256 hashes of inline code are added to the CSP automatically.
- **Your own chatbot:** set an endpoint URL and key. The site shows a lightweight chat window (kept above the mobile bottom bar) and proxies messages through `/api/chat`, so the key never reaches the browser. Your service receives `{ message, history, page, site }` (site includes the API base and booking deep-link format) and returns `{ reply, links? }`. Give it a `read`-scoped API key to look up locations, hours, doctors, services and FAQs.

---

## Architecture

```
src/
  env.ts                      environment variable declarations ($app/env/private)
  hooks.server.ts             db + settings per request, sessions, admin guard, page cache, CSP/security headers
  lib/
    types.ts, permissions.ts  shared types; role → permission matrix
    settings/schema.ts        every clinic setting (Zod, with defaults)
    content/collections.ts    simple content lists declared once → admin forms + validation
    booking/availability.ts   pure day/window/slot logic (shared by browser, server, API)
    maps.ts, time.ts, seo.ts  Google Maps parsing, time zones, JSON-LD
    server/
      platform.ts             the ONLY way feature code reaches db/storage/email/cache/background work
      target/node.ts          better-sqlite3, local disk/S3, SMTP, in-memory page cache
      target/cloudflare.ts    D1, R2, Cache API, waitUntil (via cloudflare:workers)
      db/schema.ts            Drizzle schema (portable SQLite; text ids, UTC millisecond times)
      booking.ts, notifications.ts, queries.ts, auth.ts, crypto.ts, sanitize.ts …
      api/, integrations/     REST API helpers, webhooks, providers, channels
    admin/, components/       admin UI and public UI components
  routes/(site)/              public website        routes/admin/  admin panel
  routes/api/v1/              REST API              routes/api/chat, routes/api/internal/cron
scripts/                      seed, create-admin, migrate, migrate-data, demo assets
drizzle/                      SQL migrations (used by drizzle and by wrangler d1)
deploy/                       Caddyfile, backup.sh
e2e/                          Playwright tests
```

Key decisions:

- **One deployment = one clinic;** everything clinic-specific is data.
- **No Node-only code on Workers.** `vite.config.ts` aliases `#target` to the node or cloudflare module at build time, so the Worker bundle never contains `better-sqlite3`, `nodemailer` or `fs`. Passwords use PBKDF2 via Web Crypto (100 000 iterations, the Workers maximum).
- **Postgres later:** the schema avoids SQLite-only types and functions outside `db/`; adding a driver means a new branch in the target modules.
- **Settings are validated JSON rows** with defaults, so new settings need no migration.

## Security

- Server-side authorisation on every admin load/action and API call; branch staff are scoped to their branches at the query level.
- Sessions: random 256-bit tokens (only the SHA-256 is stored), HTTP-only `SameSite=Lax` `Secure` cookies, sliding expiry; login rate-limited per IP and per email.
- CSRF: SvelteKit's origin check on all form posts (foreign origins receive 403).
- CSP with per-request nonces (a fresh nonce even for cached pages), allowing Google Maps, Turnstile, GA4 (if configured) and the configured chatbot only; plus HSTS, `nosniff`, frame, referrer and permissions policies.
- Rich text and embeds sanitised with allowlists; map iframes only from `www.google.com/maps/embed`; uploads type-checked by magic bytes (SVG uploads refused), 8 MB limit, alt text required.
- Secrets (email, Turnstile, chatbot and integration tokens) are never sent to the browser; forms show "saved — leave blank to keep".
- CSV export neutralises spreadsheet formulas. Thank-you pages never show patient data.
- The privacy-policy template was written with India's DPDP Act 2023 in mind (have it reviewed); a consent timestamp is stored with every request and message.

## Testing and quality

- `npm run test:unit` — 72 tests: permissions, PBKDF2/HMAC, settings, Google Maps parsing, sanitiser, time zones and open-now, availability + slot calculation + double booking, CSV, webhook signatures.
- `npm run test:e2e` — 21 Playwright tests against a production build with its own database: admin adds and reorders hero slides; adds a location with a map (and a non-Google map is rejected); adds a doctor to two branches who then appears on both location pages; visitor requests appointments with several branches, with one branch (branch step skipped), pre-filled from a doctor, and with invalid input; axe WCAG 2.1 A/AA checks (no serious or critical issues) on 11 key pages; skip link.
- Also verified during development: the Cloudflare build on the Workers runtime (`wrangler dev` with local D1/R2) including booking, login, CSRF, uploads and page cache; the Docker image (seeded with the eye profile, health check, backup script); a D1 ⇄ SQLite round trip with matching row counts per table.
- Lighthouse (mobile, local production build): accessibility 100, SEO 100 and best practices 96 on every page tested; performance 93–97 on location, doctor and booking pages. The homepage (the longest page) measured 70–96 across repeated runs on the development machine — FCP/LCP 1.7 s and CLS 0 were stable while Total Blocking Time varied with machine load. Re-measure on the deployed site, and keep homepage sections lean.

## Build phases

1. **Foundation** ✅ — project setup, both adapters, db/storage/email providers, schema + migrations, auth and roles, admin layout, settings and branding (CSS variables), seed script.
2. **Content management** ✅ — locations (Google Maps), doctors (photos, per-branch schedules), services, certifications, hero slides, media library, homepage sections, testimonials, FAQs, pages.
3. **Public website** ✅ — all pages and homepage sections, cross-fading hero, sticky header + mobile bar, SEO/JSON-LD, sitemap.
4. **Booking** ✅ — request flow, optional live slots with double-booking protection, notifications, admin list/detail/calendar, add-by-phone, CSV export, contact inbox.
5. **Integrations** ✅ — REST API + OpenAPI, scoped API keys, signed webhooks with retries, integration/notification adapters, chatbot module.
6. **Deployment & hardening** ✅ — Workers runtime fixes and verification, Docker + Caddy + backups, data migration script, CI and deploy workflows, Playwright + axe tests, performance work.

### Known limitations / next steps

- The admin panel is English-only; public wording comes from settings and content, but a few fixed phrases ("Opening hours", "Get directions") live in components.
- Webhook retries on Cloudflare need an external scheduler for guaranteed timing (see above).
- SMS uses a generic JSON webhook; add a provider-specific channel (e.g. MSG91) if the clinic prefers.
- Vite dev with emulated Cloudflare bindings isn't available with SvelteKit 3's adapter; use `npm run preview:cf` to test the Worker build.
