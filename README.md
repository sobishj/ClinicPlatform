# Clinic Platform

One codebase and one deployment that serves many clinic websites. Each client gets their own website on their own domain, their own database, their own admin logins and bookings, and looks like a standalone site built only for them.

- **Console** (super admin, on a separate host name): add clients, choose a template, set their web addresses, suspend or delete them, and open any client's site admin.
- **Client sites:** the full clinic website (branches, doctors, services, certifications, booking, blog…) with an admin panel at `their-domain/admin`.
- **Templates:** a template is a folder under `templates/<category>/<name>/`. The original Orchid Dental Care design is **Dental → Template 1**.
- **A database per client:** a SQLite file per client on a server, a D1 database per client on Cloudflare. Clients can never see each other's data.
- **Stack:** SvelteKit 3 (Svelte 5 runes), TypeScript strict, Tailwind CSS 4, Drizzle ORM (SQLite dialect), Zod.
- **Runs on:** Cloudflare Workers free tier (Workers + D1, no R2 needed) **or** any server with Docker (Node + SQLite + local disk/S3 + Caddy with automatic HTTPS for every client domain). `DEPLOY_TARGET=cloudflare|node` picks the build.

Plans: [docs/PLATFORM_PLAN.md](docs/PLATFORM_PLAN.md), [docs/REFACTOR_PLAN.md](docs/REFACTOR_PLAN.md).

## Contents

- [Quick start](#quick-start-local)
- [Adding a client](#adding-a-client)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Deploy to Cloudflare (free tier)](#deploy-to-cloudflare-free-tier)
- [Deploy to any server (Docker)](#deploy-to-any-server-docker)
- [Moving between Cloudflare and a server](#moving-between-cloudflare-and-a-server)
- [Setting up a client's site](#setting-up-a-clients-site)
- [API, webhooks and integrations](#api-webhooks-and-integrations)
- [Chatbot](#chatbot)
- [Architecture](#architecture)
- [Security](#security)
- [Testing and quality](#testing-and-quality)

---

## Quick start (local)

Requirements: Node 20.19+ (22 recommended). No Cloudflare account and no hosts-file edits needed: browsers resolve every `*.localhost` name to your own machine.

```bash
npm install
npm run seed -- --console-email=you@example.com --console-password='a-long-password'
npm run dev
```

| Address                       | What                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| http://console.localhost:5173 | Console (super admin). Without `--console-email`, the first visit creates the console login. |
| http://orchid.localhost:5173  | Orchid Dental Care (+ `/admin`)                                                              |
| http://demo.localhost:5173    | Demo Dental Clinic (+ `/admin`), sample content only                                         |

`npm run seed` creates the two clients if they don't exist yet:

- **Orchid** is imported from `./data/clinic.db` (the database of the original single-site version, with its content, uploads and admin logins) when that file exists. Otherwise it gets the template's sample content.
- **Demo** always gets sample content.

`npm run seed -- --reset` starts over.

> `.npmrc` sets `legacy-peer-deps=true` because npm's peer resolver currently crashes on this dependency tree.
> On Windows, run commands from PowerShell or cmd: Git Bash's lower-case `c:` drive path makes Vitest load twice.

## Adding a client

**In the console:** Clients → **Add client**, then fill in:

- **Name** and **template**.
- **Client URLs**, one per line. The first is the main address and the others redirect to it. Locally, any `name.localhost` works.
- **Client admin login** (optional).

Creating the client:

1. creates the client's own database;
2. fills it with the template's sample content, all of which is editable in their admin;
3. creates the login;
4. connects the addresses.

From the client's page in the console you can:

- add or remove addresses, or change the main one;
- add logins or reset passwords (_Clinic admin_ edits the site and sees bookings; _Staff_ sees bookings only);
- suspend the site (visitors see "temporarily unavailable");
- change the template;
- **Open site admin**: a one-time sign-in to that client's `/admin` on the client's own domain;
- delete the client.

**From the command line** (local or server installs):

```bash
npm run tenant -- create --name="Smile Care" --domain=smile.localhost --admin-email=owner@smile.in --admin-password='…'
npm run tenant -- import --name="Orchid Dental Care" --slug=orchid --domain=www.orchiddental.in --from=./orchid-d1-export.sql
npm run tenant -- list
npm run tenant -- domain --slug=smile --add=www.smilecare.in --primary
npm run tenant -- admin  --slug=smile --email=staff@smile.in --password='…' --role=branch_staff
npm run tenant -- delete --slug=smile     # moves its database and files to data/tenants/_deleted/
```

`import` turns any database of the original single-site version into a client and keeps everything: content, uploads, logins and bookings. It accepts a SQLite file or a `wrangler d1 export` dump.

## Scripts

| Command                                                  | What it does                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                            | Dev server (Node target, local SQLite files and disk storage)                                                             |
| `npm run seed`                                           | Local setup: Orchid + Demo clients (and a console login with `--console-email/--console-password`)                        |
| `npm run tenant -- <command>`                            | Manage clients: `list`, `create`, `import`, `domain`, `admin`, `delete`, `migrate`, `console-admin`                       |
| `npm run console:admin -- --email=… --password=…`        | Create a console login or reset its password                                                                              |
| `npm run build:node` / `npm start`                       | Build and run the Node server (`build/`)                                                                                  |
| `npm run build:cf`                                       | Build the Cloudflare Worker (`.svelte-kit/cloudflare`)                                                                    |
| `npm run preview:cf`                                     | Build for Cloudflare and run it locally with `wrangler dev` (local D1), at http://console.localhost:8787 etc.             |
| `npm run deploy:cf`                                      | Build and deploy to Cloudflare                                                                                            |
| `npm run db:generate`                                    | New migrations after editing `src/lib/server/db/schema.ts` (clients) or `src/lib/server/platform-db/schema.ts` (platform) |
| `npm run db:migrate`                                     | Apply pending migrations to the platform database and every client database (the app also does this automatically)        |
| `npm run migrate:data -- to-cloudflare\|from-cloudflare` | Move one client's data (and uploaded files) between D1 and SQLite + disk                                                  |
| `npm run backup`                                         | One backup now (`deploy/backup.sh once`)                                                                                  |
| `npm run check`                                          | Type-check (svelte-check)                                                                                                 |
| `npm run test:unit`                                      | Unit tests (Vitest)                                                                                                       |
| `npm run test:e2e`                                       | End-to-end + accessibility tests (Playwright, own seeded databases)                                                       |

## Environment variables

All are optional for local development. The full documented list is in [`.env.example`](.env.example). Values set in the environment override the matching settings in each client's admin.

| Variable                                                   | Used for                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DEPLOY_TARGET`                                            | Build time: `node` (default) or `cloudflare`                                                                                   |
| `PLATFORM_ADMIN_HOST`                                      | Host name of the console, e.g. `console.example.com` (default `console.localhost`)                                             |
| `PLATFORM_DATABASE_PATH`, `TENANT_DATA_DIR`                | Node: platform database file (`./data/platform.db`) and the folder with one sub-folder per client (`./data/tenants`)           |
| `PROTOCOL_HEADER`, `ADDRESS_HEADER`, `XFF_DEPTH`           | Node behind a proxy: `x-forwarded-proto`, `X-Forwarded-For`, `1`. **Don't set `ORIGIN`**: one server answers for many domains. |
| `STORAGE_DRIVER`, `UPLOAD_DIR`, `S3_*`                     | Node: local disk (default) or any S3-compatible bucket (each client gets the prefix `tenants/<id>/`)                           |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `SMTP_*` | Email defaults (each client can also set their own in their admin)                                                             |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`               | Spam protection on booking/contact forms                                                                                       |
| `CRON_SECRET`                                              | Bearer token for `POST https://<console host>/console/cron` (webhook retries and cleanup for all clients)                      |
| `SETUP_TOKEN`                                              | Protects the first-run `/console/setup` screen                                                                                 |

On Cloudflare, plain values go in `wrangler.toml` `[vars]`; secrets with `npx wrangler secret put NAME`.

---

## Deploy to Cloudflare (free tier)

> The production deployment steps (real database ids, domains, DNS) will be completed once the Cloudflare account is set up. Everything below already works locally with `npm run preview:cf`.

Uses Workers (with static assets) and D1 only. Turnstile is optional.

- **Databases:** `PLATFORM_DB` holds clients, addresses and console logins. Each client gets its own D1 database, declared in `wrangler.toml` as a `TENANT_*` binding.
- **Slots:** bindings are fixed at deploy time, so declare a few spare `TENANT_*` "slots". The console assigns a free one when you add a client and shows how many are in use.
- **Free plan:** 10 D1 databases per account, i.e. the platform plus up to 9 clients.
- **Tables** are created automatically the first time each database is used, so there are no migration commands to run.
- **Uploaded images** live in each client's own D1 database (`media_chunks`) and are served at `/media/…` on the client's own domain, with edge caching.

Outline:

```bash
npx wrangler login
npx wrangler d1 create clinic-platform           # paste the id into wrangler.toml (PLATFORM_DB)
npx wrangler d1 create clinic-tenant-1           # repeat for each slot; paste the ids
npx wrangler secret put CRON_SECRET              # optional
# set PLATFORM_ADMIN_HOST in wrangler.toml [vars]
npm run deploy:cf
```

Then:

- Route the console host and the client domains to the Worker (Cloudflare custom domains, or Cloudflare for SaaS custom hostnames for domains on other accounts).
- Open `https://<console host>/console` to create the console login.

To try the Worker build locally: `npm run preview:cf`, then open http://console.localhost:8787.

### Automatic deploys from GitHub

`.github/workflows/deploy-cloudflare.yml` builds and deploys on pushes to `main`. It is opt-in:

1. Add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Put the real D1 ids in `wrangler.toml`.
3. Set the repository variable `DEPLOY_TO_CLOUDFLARE=true`.

### Staying in the free tier

- Public pages are cached (Cache API) under a key made of the client id and that client's content version. Any edit refreshes only that client's pages, and most visits never touch D1.
- Host → client lookups are cached in memory, so they add no query to normal requests.
- Adding a client runs migrations and seeding as two D1 calls, well inside the per-request query limit.
- Images are resized and converted to WebP **in the browser** before upload.

---

## Deploy to any server (Docker)

Works on a VPS, AWS EC2/Lightsail, Azure VM, Google Compute Engine or on-premise.

```bash
git clone <repo> clinic && cd clinic
cp .env.example .env      # set PLATFORM_ADMIN_HOST=console.example.com, CRON_SECRET, email keys…
docker compose up -d --build
docker compose exec app npm run console:admin -- --email=you@example.com --password='a-long-password'
```

Point the console host and every client domain (A/AAAA records, or a CNAME to the server) at the server, then add clients in the console.

| Service  | Purpose                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app`    | Node build: platform database + one SQLite database and upload folder per client in the `clinic-data` volume, migrations applied automatically, health check at `/_internal/health`                                    |
| `caddy`  | Reverse proxy with **automatic HTTPS for every client domain** (on-demand TLS). A certificate is only issued for host names the app confirms at `/_internal/domain-check`. See [`deploy/Caddyfile`](deploy/Caddyfile). |
| `backup` | Daily at `$BACKUP_HOUR`: consistent snapshots of the platform database and every client database, plus each client's uploads, kept `$BACKUP_KEEP_DAYS` (14) days in `./backups/<stamp>/`                               |
| `cron`   | Calls the housekeeping endpoint for all clients every 10 minutes when `CRON_SECRET` is set                                                                                                                             |

Without Docker: run `npm ci && npm run build:node`, then run `node build` under systemd behind Caddy or nginx. Set `PROTOCOL_HEADER=x-forwarded-proto`, `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`.

## Moving between Cloudflare and a server

One client at a time:

```bash
# Cloudflare → server: export that client's D1 database and import it as a client
npx wrangler d1 export clinic-tenant-1 --remote --output=client.sql
npm run tenant -- import --name="Orchid Dental Care" --slug=orchid --domain=www.orchiddental.in --from=client.sql

# Server → Cloudflare: copy a client's database and files into a D1 database
npm run migrate:data -- to-cloudflare --db=./data/tenants/<id>/site.db --uploads=./data/tenants/<id> --d1=clinic-tenant-2
```

`import` also extracts uploaded files that were stored in D1 (`media_chunks`) to disk. Media URLs (`/media/uploads/…`) are identical on both targets.

---

## Setting up a client's site

Each client starts with the template's sample content. In the client's admin (`their-domain/admin`, or **Open site admin** from the console), replace it step by step:

1. **Settings → Clinic & branding:** name, logo, colours, fonts (live preview), phones, WhatsApp, social links, time zone.
2. **Settings → Type, labels & modules:** clinic type (drives structured data), wording ("Dentists", "Treatments"), and which sections exist at all.
3. **Locations** (paste the Google Maps share link or "Embed a map" code), then **Doctors** (photos with crop; branches with a weekly schedule each), **Services**, **Certifications**.
4. **Hero slides**, **Homepage** (drag sections, edit headings), **Content blocks** (FAQs, testimonials, intent cards…), **Pages & blog** (about, privacy, terms).
5. **Settings → Booking / Notifications & email / SEO, analytics & spam**, then **Users**.

### Roles

| Role                                  | Can do                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Super admin                           | Everything in that client's admin, including settings, users and integrations (the console uses this role when you open a client's admin) |
| Clinic admin                          | All content, colours & branding, and all appointments                                                                                     |
| Branch staff ("Staff" in the console) | Appointments only (all branches, or the branches assigned to them); content read-only                                                     |

Client logins exist only in that client's database, so they work only on that client's own domain. Every admin load/action checks permissions on the server; `hooks.server.ts` also blocks unauthenticated `/admin/*`. All changes are written to the client's **audit log**; console actions go to the console activity log.

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
templates/<category>/<name>/manifest.json   site templates (dental/template-1 = the original design)
src/
  hooks.server.ts             Host → console or client; primary-domain redirects; client database, settings,
                              sessions, admin guard, page cache, CSP/security headers
  lib/
    templates/registry.ts     discovers templates/*/*/manifest.json at build time
    settings/schema.ts        every client setting (Zod, with defaults)
    server/
      platform.ts             the ONLY way feature code reaches databases/storage/email/cache/background work
      target/node.ts          better-sqlite3 (platform + one file per client), local disk/S3, SMTP, memory cache
      target/cloudflare.ts    D1 (PLATFORM_DB + one TENANT_* binding per client), Cache API, waitUntil
      platform-db/schema.ts   platform database: tenants, domains, console users/sessions, SSO tokens, audit
      db/schema.ts            client database (same schema for every client)
      db/migrator.ts          runtime migrator for D1 and SQLite (migrations bundled into the app)
      tenancy/                host resolution, provisioning (add/delete client), sample content, profiles
      console/                console authentication
      booking.ts, notifications.ts, queries.ts, auth.ts, crypto.ts, sanitize.ts …
  routes/console/             console (only on PLATFORM_ADMIN_HOST)
  routes/(site)/              public website        routes/admin/  client admin panel (+ /admin/sso)
  routes/api/v1/              REST API              routes/api/chat, routes/api/internal/cron
scripts/                      tenant (client CLI), seed, migrate-data, visual snapshots
drizzle/, drizzle-platform/   SQL migrations for client databases and the platform database
deploy/                       Caddyfile (on-demand TLS), backup.sh
e2e/                          Playwright tests
```

Key decisions:

- **A database per client.** Every request is bound to the database of the client its Host header belongs to, so no query can reach another client's data, even without a `WHERE`. Sessions, API keys, uploads and caches are per client too.
- **One public address per client.** Every other address of a client redirects to its main address (301), and unknown hosts get a bare 404 with no branding.
- **No Node-only code on Workers.** `vite.config.ts` aliases `#target` to the node or cloudflare module at build time, so the Worker bundle never contains `better-sqlite3`, `nodemailer` or `fs`. Migrations are bundled into the app by a small Vite plugin. Passwords use PBKDF2 via Web Crypto.
- **Settings are validated JSON rows** with defaults, so new settings need no migration.

## Security

- **Client isolation:** each client has its own database (and upload folder / D1 database). The Host header selects it before any route runs; sessions, API keys, media and page-cache entries never cross clients. Covered by end-to-end tests.
- **Console:** separate host name, separate accounts and sessions (platform database, `SameSite=Strict` cookie), rate-limited login. "Open site admin" uses a one-time token valid for 60 seconds, accepted only on that client's domain.
- Server-side authorisation on every admin load/action and API call; branch staff are scoped to their branches at the query level.
- Sessions: random 256-bit tokens (only the SHA-256 is stored), HTTP-only `SameSite=Lax` `Secure` cookies, sliding expiry; login rate-limited per IP and per email.
- CSRF: SvelteKit's origin check on all form posts (foreign origins receive 403).
- CSP with per-request nonces (a fresh nonce even for cached pages), allowing Google Maps, Turnstile, GA4 (if configured) and the configured chatbot only; plus HSTS, `nosniff`, frame, referrer and permissions policies.
- Rich text and embeds sanitised with allowlists; map iframes only from `www.google.com/maps/embed`; uploads type-checked by magic bytes (SVG uploads refused), 8 MB limit, alt text required.
- Secrets (email, Turnstile, chatbot and integration tokens) are never sent to the browser; forms show "saved — leave blank to keep".
- CSV export neutralises spreadsheet formulas. Thank-you pages never show patient data.
- The privacy-policy template was written with India's DPDP Act 2023 in mind (have it reviewed); a consent timestamp is stored with every request and message.

## Testing and quality

- `npm run test:unit`: 109 tests. They cover permissions, PBKDF2/HMAC, settings, Google Maps parsing, the sanitiser, time zones and open-now, availability and slot calculation and double booking, CSV and webhook signatures. For the platform they also cover host-name parsing, the runtime migrator (fresh databases, and adopting databases created by drizzle or wrangler), the template registry, sample-content seeding and client logins.
- `npm run test:e2e`: 26 Playwright tests against a production build with its own seeded databases (two clients plus the console). They cover:
  - the original site tests: admin content management, booking flows, and axe WCAG 2.1 A/AA checks on 11 pages;
  - platform tests: each host serves its own client; unknown hosts get a bare 404; a client login is refused on another client and on the console; the console adds a client with a template and two addresses, and the second address redirects to the main one; the client admin signs in on their own domain only; "Open site admin" works; suspend, change the main address and delete all work.
- Visual check: `node scripts/visual-snapshots.mjs <base URL> <folder>` screenshots 14 pages at desktop and mobile widths. Dental → Template 1 rendered by the platform was compared pixel by pixel with the original single-site version and is identical. The only difference is the live Google Maps embed, plus the old first-run setup screen, which client sites no longer have.
- Also verified: the Worker build on the Workers runtime (`wrangler dev`, local D1), covering console setup, adding two clients into D1 slots, per-client sites, logins, uploads and media isolation, and Open site admin. The Docker image was verified with clients seeded inside the container, the health check and the on-demand TLS check.

## Known limitations / next steps

- Deployment details (real D1 ids, console host, client domains / Cloudflare for SaaS, DNS) are set up once the hosting account is ready.
- Only one template exists so far. The template registry, assignment and switching are in place; templates with different page designs come next ([docs/PLATFORM_PLAN.md](docs/PLATFORM_PLAN.md) §6).
- On Cloudflare, each client needs a pre-declared D1 slot, so adding slots means a redeploy (free plan: up to 9 clients).
- Postgres/MySQL support and the add-on framework (chatbot) are planned in [docs/REFACTOR_PLAN.md](docs/REFACTOR_PLAN.md).
- The admin panel is English-only; a few fixed phrases ("Opening hours", "Get directions") live in components.
- SMS uses a generic JSON webhook; add a provider-specific channel (e.g. MSG91) if a clinic prefers.
