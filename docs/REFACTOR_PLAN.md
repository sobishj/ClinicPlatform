# Refactor Plan — portability, a database per client, add-ons

Status: **audit complete, waiting for approval.** No code has been changed.

## 0. Starting point and how this plan relates to PLATFORM_PLAN.md

The multi-tenant platform described in [PLATFORM_PLAN.md](PLATFORM_PLAN.md) **has not been built yet**. `main` contains the single-clinic Orchid site plus the two plan documents, and no other branch or local copy has platform code. As agreed, this document **merges both briefs into one build order**:

- **(A)** portability, **(B)** a database per client and **(C)** add-ons are designed in from the start.
- The platform features from PLATFORM_PLAN.md (tenants, domains, super admin, templates, site editor, white-label) are built on top of them.
- Where this brief changes PLATFORM_PLAN.md, this document wins:
  - Drizzle is replaced by Kysely.
  - "One shared database with tenant_id" becomes "a database per tenant, with an optional shared pool".
  - The super-admin data model gains a tenant-DB registry and an add-on registry.

Everything in §1–§3 below was measured on the current code (commit `b82f249`).

---

## 1. Audit — vendor and database dependencies

### 1.1 Cloudflare-specific code

| What | Where | Notes |
| --- | --- | --- |
| `cloudflare:workers` (`env`, `waitUntil`) | [src/lib/server/target/cloudflare.ts:10](../src/lib/server/target/cloudflare.ts) | Already isolated in the Cloudflare target module. |
| D1 binding `DB` | `target/cloudflare.ts`, [src/app.d.ts:2-28](../src/app.d.ts), [wrangler.toml](../wrangler.toml) | One static binding. There is one database today. |
| `DrizzleD1Database` as the app-wide DB type | [src/lib/server/db/index.ts:1,10](../src/lib/server/db/index.ts) | **Every feature file is typed against D1's Drizzle type.** |
| Cache API (`caches.default`, fake host `https://page-cache.internal`) | `target/cloudflare.ts:50-72` | Isolated. Becomes the Cache port. |
| D1 as file storage (`media_chunks`, 40 KB BLOB chunks) | [src/lib/server/storage/d1.ts](../src/lib/server/storage/d1.ts) | Raw SQL. Isolated behind `Storage`. |
| `cf-connecting-ip` header | [src/lib/server/rate-limit.ts:32](../src/lib/server/rate-limit.ts) | Inside `clientIp()`, called from 4 routes. Becomes the RequestInfo port. |
| Turnstile (`cf-turnstile-response`, `challenges.cloudflare.com`) | [Turnstile.svelte](../src/lib/components/site/Turnstile.svelte), `book`/`contact` actions, [vite.config.ts](../vite.config.ts) CSP | A third-party captcha, not a hosting dependency. It works on any host. It stays, behind a `Captcha` port so hCaptcha/reCAPTCHA can be added. |
| `@cloudflare/workers-types` | `app.d.ts`, `cloudflare-workers.d.ts` | Types only. |
| `request.cf`, KV, R2, Queues, Durable Objects | — | **Not used.** |
| wrangler-only scripts | [scripts/seed.ts](../scripts/seed.ts), [scripts/create-admin.ts](../scripts/create-admin.ts), [scripts/migrate-data.ts](../scripts/migrate-data.ts) (emit SQL for `wrangler d1 execute`), `package.json` `db:migrate:d1*`, `deploy:cf` | Replaced by the dialect-neutral migrate/export/import CLI. |

### 1.2 Node-only code

| What | Where |
| --- | --- |
| `better-sqlite3`, drizzle better-sqlite3 migrator, `node:fs`, `node:path`, `process.env.MIGRATIONS_DIR` | [src/lib/server/target/node.ts](../src/lib/server/target/node.ts) |
| `nodemailer` (SMTP) | `target/node.ts:108-130` (lazy import) |
| `aws4fetch` (S3) | [src/lib/server/storage/s3.ts](../src/lib/server/storage/s3.ts). It uses fetch, so it also works on Workers. |
| `node:fs` in tests | `src/lib/admin/help.spec.ts` (test only, fine) |

Core code otherwise uses only Web APIs: fetch, Web Crypto (PBKDF2, SHA-256, HMAC in [crypto.ts](../src/lib/server/crypto.ts)), `btoa`/`atob`, URL. **There is no `Buffer` or `process.env` in core code.** The build-time alias `#target` ([vite.config.ts:24-25, 69](../vite.config.ts)) already keeps Node modules out of the Worker bundle. The new layout keeps this approach.

### 1.3 Database coupling

| Item | Where | Portability problem | Fix |
| --- | --- | --- | --- |
| Drizzle `sqliteTable` schema | [src/lib/server/db/schema.ts](../src/lib/server/db/schema.ts) (543 lines, 30 tables) | Drizzle schemas are per dialect (`sqliteTable`/`pgTable`/`mysqlTable`), so supporting four databases means four schemas. | One Kysely-based schema definition (§4.3). |
| Direct DB access outside a data layer | **52 files import drizzle; 37 of them are route files** (`src/routes/**`) | Routes build queries themselves. | Everything moves to `src/lib/server/repositories/`. |
| `.get()` (Drizzle SQLite-only "first row") | ~45 call sites in 30 files (largest: `booking.ts` 7, `crud.ts` 3) | Not in the PG/MySQL drivers. | `executeTakeFirst()` inside repositories. |
| Raw `sql\`…\`` | `rate-limit.ts:18-26`, `storage/d1.ts`, `media.ts:61,95`, `appointments-admin.ts:25-40`, `admin/+page.server.ts:11,28`, `admin/login` & `admin/setup` (`COUNT(*)`), `admin/messages:12` | See the next rows. | Rewritten through Kysely helpers. |
| `INSERT … ON CONFLICT … DO UPDATE … RETURNING` | `rate-limit.ts:18`, `settings.ts` (2×), `scripts/seed.ts` | MySQL has no `RETURNING` and uses `ON DUPLICATE KEY`. SQL Server uses `MERGE`/`OUTPUT`. | `upsert()` helper per dialect. The rate limiter keeps a 1-query path where `RETURNING` exists and uses 2 queries on MySQL/MSSQL. |
| `sql\`0\`` as "always false" | `appointments-admin.ts:25,40`, `admin/+page.server.ts:28`, `admin/messages:12` | Postgres and SQL Server reject a bare integer in `WHERE`. | `1 = 0` via a `never()` helper. |
| `LIKE` for search | `appointments-admin.ts:36-40`, `media.ts:58-59`, `admin/audit:15`, `media.ts:95`, `storage/d1.ts:56` | Case-insensitive on SQLite/MySQL/MSSQL but **case-sensitive on Postgres**. | `lower(col) LIKE lower(?)` in a `search()` helper, so all dialects behave like today. |
| Partial unique index `appt_doctor_slot_uq … WHERE slot_start IS NOT NULL AND … status <> 'cancelled'` | `schema.ts:446-449`, `drizzle/0000_init.sql:53` | **MySQL has no partial indexes.** This index is the double-booking guard. | New table `booking_slot_locks (tenant_id, doctor_id, slot_start)` with a PK, inserted in the same atomic batch as the booking and deleted on cancel. Same guarantee on every dialect. |
| `BEGIN/COMMIT` on better-sqlite3, `batch()` on D1 | [db/index.ts:18-41](../src/lib/server/db/index.ts) (`runBatch`) | D1 has **no interactive transactions**. | Keep the existing "collect statements, run atomically" model as `db.atomic([...])`: D1 → `batch()`, others → a real transaction. Code never relies on reading inside a transaction (it doesn't today). |
| Boolean columns (`integer mode:'boolean'`) | ~25 columns | 0/1 on SQLite, `boolean` on PG, `tinyint(1)` on MySQL, `bit` on MSSQL; drivers return different JS types. | Column helper `bool()` + row mappers return `true/false` everywhere. |
| JSON columns (`text mode:'json'`) | ~30 columns | Stored as text today. | Stay **text** on every dialect (TEXT / LONGTEXT / NVARCHAR(MAX)). Parsed and serialised only in repositories. |
| Timestamps: integer ms (`Date.now()` in `$defaultFn`) | every table | Values above 2³¹ need **BIGINT** on PG/MySQL/MSSQL. `pg` returns int8 as a string. | `ts()` helper → BIGINT. The driver type parser plus mapper return `number`. Values keep being created in the app, in UTC. |
| Dates as `YYYY-MM-DD` text | bookings, leaves, closures | Portable already. | Keep. |
| `real` (latitude/longitude) | `locations` | Portable (`double precision` / `DOUBLE` / `FLOAT`). | `float()` helper. |
| `blob` | `media_chunks.data` | `bytea` / `LONGBLOB` / `VARBINARY(MAX)`. | `bytes()` helper. Only used by the D1 storage driver. |
| Unbounded `text` in unique/indexed columns (ids, slugs, emails, keys) | many | MySQL can't index `TEXT`, and SQL Server can't index `NVARCHAR(MAX)`. | Indexed strings get explicit lengths: id 36, slug 160, email 254, key 255. |
| Column named `key` | `settings`, `media`, `rate_limits`, `media_chunks` | Reserved word in MySQL. | Kysely always quotes identifiers, so this is safe. A schema lint flags reserved words for raw-SQL safety. |
| `COUNT(*)` results | 5 places | `bigint` → string on PG/MySQL. | `count()` helper returns `number`. |
| Auto-increment / DB-generated ids / triggers / procedures / DB functions | — | **None found.** Ids are app-generated UUIDs already. Only `REPLACE()`/`lower()`/`COUNT()` are used, and they're standard on all four. | Keep; ULIDs optional for new tables. |
| Migrations | `drizzle/` (3 SQLite migrations), applied by drizzle (Node) or `wrangler d1 migrations apply` | SQLite-only SQL. | New dialect-neutral migrations in `/migrations` (§4.4). |

### 1.4 Hard-coded URLs and hostnames

| What | Where | Action |
| --- | --- | --- |
| `no-reply@example.com` fallback sender | [src/lib/server/platform.ts:36](../src/lib/server/platform.ts) | Move to config (`EMAIL_DEFAULT_FROM`). |
| `https://page-cache.internal` | `target/cloudflare.ts:50` | Internal cache key, never public. Keep inside the CF adapter. |
| CSP hosts (Google Fonts/Maps, Turnstile) | `vite.config.ts` | Third-party services the site uses, not hosting. Keep. |
| Worker name `clinic-site` and the **live Orchid D1 id** | `wrangler.toml` | ⚠ Still points at production. Replaced by a generated `wrangler.toml` (§5.3). Don't run `deploy:cf` until then. |
| Caddy single `{$DOMAIN}` | [deploy/Caddyfile](../deploy/Caddyfile) | Becomes on-demand TLS (§6.2). |

Everything else (theme preset "orchid", maps tests, link validators) is data or tests, not configuration.

### 1.5 Measured baseline

| Metric | Value |
| --- | --- |
| Worker bundle (`wrangler deploy --dry-run`) | **2,408 KiB raw / 440 KiB gzip** (free limit: 3 MB gzip) |
| CPU time per request | **Not measurable locally** (`wrangler dev` doesn't enforce or report the 10 ms limit). Needs a staging Worker; see decision Q6. |
| Queries per homepage request | ~15 (settings 1, nav 3, sections up to 13 in parallel) |

---

## 2. Audit — how data is stored and what goes where

There is no tenant concept today. Every table belongs to the one clinic. Under the new design:

| Today's table(s) | Goes to | Why |
| --- | --- | --- |
| *(new)* `tenants`, `domains`, `categories`, `templates`, `tenant_databases`, `addons`, `tenant_addons` (enabled flag only), `usage_summaries`, `platform_users`, `platform_sessions`, `platform_audit_log`, `provisioning_jobs`, `migration_runs` | **Platform DB** | Needed to route a request before a tenant DB is chosen, or to see every tenant at once. |
| `settings` (theme, SEO, contact, booking, email, labels, modules, …) | Tenant DB | Client content. |
| *(new)* `tenant_pages`, `tenant_sections`, `tenant_content_archive` | Tenant DB | Site editor content. |
| `locations` (branches), `location_closures`, `doctors`, `doctor_locations`, `doctor_leaves`, `services`, `service_locations`, `service_doctors`, `certifications`, `slides`, `blocks` (testimonials, FAQs, gallery, intents…), `pages` (custom + blog) | Tenant DB | Structured data. |
| `appointments` (bookings), `appointment_notes`, *(new)* `booking_slot_locks`, `messages` | Tenant DB | Bookings and inbox. |
| `media`, `media_chunks` (only when the D1 storage driver is used) | Tenant DB | Media records; files go to FileStorage under `t/<tenantId>/…`. |
| `users`, `user_locations`, `sessions`, `password_resets`, `audit_log` | Tenant DB | Client users and sessions. |
| `api_keys`, `webhooks`, `webhook_deliveries` | Tenant DB | Tenant-scoped API. |
| *(new)* `addon_settings` (incl. encrypted secrets) | Tenant DB | Per-tenant add-on configuration. |
| `rate_limits` | Tenant DB for tenant traffic; platform DB for the console host | Keeps the counters and writes in the DB they protect. |

**Every tenant table keeps a `tenant_id NOT NULL` column in every mode**, including dedicated databases. That makes shared mode safe, makes dedicated ↔ shared moves a plain copy, and lets a single repository code path serve both.

---

## 3. Audit — existing chatbot, widget, integration and API-key code

### 3.1 In this repo (reusable)

| Piece | Where | Reuse |
| --- | --- | --- |
| Chatbot settings (`provider: none\|embed\|endpoint`, embed code, endpoint URL, API key, title, greeting) | [settings/schema.ts](../src/lib/settings/schema.ts) `chatbotSchema`; admin [settings/chatbot](../src/routes/admin/settings/chatbot) | **Kept unchanged** as the existing "third-party widget / own endpoint" feature. The new add-on is separate and takes precedence when enabled. |
| Embed parser + CSP hashes for third-party snippets | [src/lib/chatbot/embed.ts](../src/lib/chatbot/embed.ts), `hooks.server.ts` | Kept. Not used by the new add-on (it's loaded same-origin). |
| `/api/chat` proxy to an external chatbot endpoint (rate-limited, keeps the key server-side) | [src/routes/api/chat/+server.ts](../src/routes/api/chat/+server.ts) | Kept. The new add-on uses `/assistant/*` so it doesn't collide (see 3.2). |
| Lightweight chat UI | [ChatWidget.svelte](../src/lib/components/site/ChatWidget.svelte) | Kept for "endpoint" mode. |
| REST API `/api/v1` (site, locations, doctors, services, faqs, availability, appointments create/list/read/patch) + OpenAPI JSON | [src/routes/api/v1](../src/routes/api/v1) | **Basis of the chatbot booking API.** It already accepts `source: 'chatbot'` and `X-API-Key`. Missing: a cancel endpoint, key rotation, and a YAML spec in `docs/api/`. |
| Scoped API keys (SHA-256 stored, shown once, revocable, last-used, 600 req/10 min) | [src/lib/server/api/auth.ts](../src/lib/server/api/auth.ts), admin integrations | Reused. It gains tenant binding, rotation and a `content:feed` scope. |
| Signed webhooks with retries | [src/lib/server/integrations/webhooks.ts](../src/lib/server/integrations/webhooks.ts) | Reused for "on Publish, notify the chatbot". |
| Integration provider registry (`IntegrationProvider`, generic HTTP bridge) | [src/lib/server/integrations/registry.ts](../src/lib/server/integrations/registry.ts) | Becomes the pattern for add-on manifests. Practice-management integrations become add-ons later. |
| Notification channels (email, WhatsApp Cloud, SMS webhook) | [integrations/channels.ts](../src/lib/server/integrations/channels.ts) | Future WhatsApp add-on. |
| Secrets in settings | `SECRET_FIELDS` in `settings/schema.ts` | ⚠ **Stored in plain text today** (never sent to the browser, but readable in the DB). Add-on secrets will be AES-GCM encrypted. Existing secret fields move to the same encryption, a storage change only with no behaviour change. |

### 3.2 In your chatbot repos (read-only review of `sobishj/Chatbot_CloudFlare`)

These facts constrain the white-label proxy:

1. **The widget picks its API base from the URL it was loaded from** (`widget.js:16`). It then calls `/api/chat`, `/api/chat/stream`, `/api/client/<id>/config` and `/api/client/<id>/logo|bubble-icon`.
   - If we just served `widget.js` from the tenant domain, its calls would hit **this site's own `/api/chat`** (an existing route).
   - Fix with no chatbot change: serve `widget.js` *without* `data-client`, so its auto-mount does nothing. A 1 KB loader of ours then fetches `/assistant/api/config` and calls the widget's public `WebsiteAssistant.mount({ config, apiBase: location.origin + '/assistant' })`.
   - The proxy maps `/assistant/api/*` to the chatbot server, so every request in the network tab is same-origin.
2. **The bot id (`client_id`) appears in requests, and the config holds `powered_by: true, "Powered by Website Assistant"`.**
   - The proxy rewrites the config: `client_id` becomes a neutral `"site"`, and the `powered_by*` fields are forced off.
   - The proxy also injects the real bot id into chat requests server-side. The bot id and chatbot hostname never reach the browser.
   - **Remaining traces I can't remove from this side:**
     - The widget DOM element carries `data-website-assistant="<id>"` (the id will be `"site"`), which names the product.
     - Its auto-mount `console.warn("[Website Assistant] …")`, but that path isn't used.
3. **The chatbot rate-limits 20 messages/minute per IP using `CF-Connecting-IP`** (`util/http.ts:67`, `routes/public.ts:86-89`).
   - Behind a server-side proxy, every visitor of every clinic arrives from the platform's IP. **They'd share one 20/min allowance.** This needs a chatbot-side change (see Q8).
   - A trusted-proxy header (e.g. `X-Forwarded-For` accepted only with a shared secret or HMAC) would fix it.
4. **The chatbot's admin API is session-cookie only.** There's no machine-to-machine endpoint to trigger a re-crawl or ingest a feed. "On Publish, notify the chatbot to re-index" and "train from a JSON feed" therefore need a new chatbot endpoint (see Q8).
   - Until then, the chatbot's existing **sitemap crawler** works unchanged against each tenant's `sitemap.xml`. It already skips unchanged pages, and our sitemap will carry accurate `lastmod`.
5. **API actions import OpenAPI 3** from a URL and authenticate with `X-API-Key`, which this site already accepts. The booking API can be imported as-is.
6. On Cloudflare, if the chatbot Worker is on the **same account**, a Worker→Worker call should use a **service binding** rather than a public fetch. Public fetches between same-account Workers can fail. Service bindings are free and add no public hop. This becomes the Cloudflare `ChatbotTransport`; other hosts use HTTP.

---

## 4. (A) Database independence

### 4.1 Query builder: Kysely

- **Dialects:** Postgres, MySQL, SQL Server and SQLite are all in Kysely core. D1 takes a ~120-line in-house dialect, which avoids depending on a community package.
- **One schema definition:** Drizzle needs a schema per dialect; Kysely's schema builder is dialect-neutral.
- **Low runtime cost:** it only compiles queries, with no ORM runtime and no codegen, so it adds very little CPU per query, which matters for the free plan's 10 ms limit.
- **TypeScript types** come from one `Database` interface.

### 4.2 Repository layer — `src/lib/server/repositories/`

```
repositories/
  db.ts              Db type (Kysely<TenantSchema>), atomic(), helpers: upsert, count, search, never, bool/json/ts mappers
  dialects/          sqlite.ts (better-sqlite3), d1.ts, postgres.ts, mysql.ts, mssql.ts  — loaded via build-time alias / dynamic import
  tenant-scope.ts    every tenant query gets `where tenant_id = ?` and every insert sets it (shared + dedicated)
  settings.repo.ts   pages.repo.ts  sections.repo.ts  locations.repo.ts  doctors.repo.ts  services.repo.ts
  blocks.repo.ts     slides.repo.ts certifications.repo.ts  bookings.repo.ts  messages.repo.ts  media.repo.ts
  users.repo.ts      sessions.repo.ts  audit.repo.ts  api-keys.repo.ts  webhooks.repo.ts  addons.repo.ts  rate-limits.repo.ts
  platform/          tenants.repo.ts domains.repo.ts tenant-dbs.repo.ts templates.repo.ts usage.repo.ts platform-users.repo.ts
  resolver.ts        TenantDbResolver interface
```

- **Repositories take a `TenantContext`** (`{ tenantId, db }`) and expose intent-level functions such as `bookings.listForAdmin(ctx, filters)` and `doctors.bySlug(ctx, slug)`. Routes, templates and business logic (`booking.ts`, `notifications.ts`, …) call these and never see SQL or the driver.
- **No extra round trips:** each current query maps 1:1 to a repository query. Parallel `Promise.all` loads stay parallel. A test counts queries per page (homepage, doctor page, booking submit, admin bookings list) and compares them with the baseline.
- **A CI guard** fails the build if anything outside `src/lib/server/repositories/**` imports `kysely`, a driver or a dialect.

### 4.3 One schema definition

- **`src/lib/server/schema/tables.ts`** declares each table once, using portable column helpers:
  - `id()` = VARCHAR(36);
  - `str(n)`, `text()` (TEXT / LONGTEXT / NVARCHAR(MAX));
  - `bool()`, `ts()` = BIGINT ms UTC, `json()` = text, `float()`, `bytes()`;
  - indexes, composite uniques and foreign keys.
- **From that one definition we derive:**
  - the TypeScript `Database` types;
  - the Kysely migrations;
  - the export/import table list and column types.

### 4.4 Migrations — `/migrations`

- **Migrations are TS files** (`migrations/tenant/0001_init.ts`, `migrations/platform/0001_init.ts`) using the Kysely schema builder and the same column helpers, so each runs on every dialect.
- **Our own small runner** (`scripts/db/migrate.ts`) records `{version, name, checksum, applied_at}` in `_migrations` in each DB.
  - D1 has no transactional DDL, so each migration is written to be re-runnable (`ifNotExists`).
  - The runner executes against D1 through the **D1 HTTP API** from Node/CI, so `migrate:all` reaches every remote tenant DB without needing their bindings. Locally it uses Wrangler's local D1.
- **Commands:**
  - `npm run db:migrate:all` runs the platform DB, then every tenant DB from the registry. It continues past failures and prints a table with db, from→to and status, then exits non-zero if anything failed.
  - `npm run db:migrate -- --tenant <slug>` and `-- --platform` cover one database.
  - Versions are written to `tenant_databases.schema_version` and shown in the super admin.

### 4.5 Repository tests on every dialect

- **One Vitest suite** (`src/lib/server/repositories/**/*.repo.spec.ts`) runs against: SQLite (better-sqlite3), **D1** (Wrangler `getPlatformProxy` local D1), **Postgres 16** and **MySQL 8.4** (Docker, `docker compose -f docker-compose.test.yml`).
- `DB_TEST_DIALECTS=sqlite,d1,postgres,mysql` chooses the dialects. CI runs all four in a matrix.
- SQL Server works by design. Its CI job is optional (see Q9).
- **The suite covers:**
  - CRUD for every repo;
  - booleans, JSON and timestamps round-trip identically;
  - case-insensitive search;
  - upsert;
  - atomic batch rollback;
  - the double-booking slot lock;
  - pagination;
  - tenant scoping (a shared DB with 2 tenants: no cross-reads, writes or deletes).

### 4.6 DB-neutral export/import

- **Format:** `export/<stamp>/manifest.json` (format version, schema version, source dialect, tables with row counts + SHA-256 per file, media list), plus `tables/<table>.ndjson` (one JSON row per line; booleans, timestamps and JSON normalised), plus `media/` (files) or `media-manifest.json` (keys, sizes, hashes) when `--no-media`.
- **Commands:**
  - `npm run data:export -- [--platform|--tenant <slug>|--all] --out <dir> [--no-media]`
  - `npm run data:import -- --in <dir> --target <DB_DIALECT/DATABASE_URL or tenant slug> [--tenant-id <new id>]`
  - Import runs migrations to the export's schema version, inserts in FK order in batches, copies media to the target FileStorage, then verifies counts and hashes.
- **Round-trip test** (CI + documented): seed → export from D1 → import into Postgres → export → import into MySQL → export → import into D1 → export. Every export's table hashes must be identical, and so must the media hashes.
- The old `scripts/migrate-data.ts` (wrangler/SQLite only) is replaced by these commands.

---

## 5. (B) Database per tenant

### 5.1 Platform DB tables (central)

`tenants`, `domains`, `categories`, `templates`, `platform_users`, `platform_sessions`, `platform_audit_log`, plus:

| Table | Columns |
| --- | --- |
| `tenant_databases` | tenant_id PK, isolation_mode `dedicated\|shared`, provider `d1\|sqlite\|postgres\|mysql\|mssql`, locator (D1 binding name + database id / database name / schema), pool_id (for shared), schema_version, status `provisioning\|ready\|migrating\|moving\|readonly\|failed\|deleting`, last_migrated_at, last_backup_at |
| `addons` / `tenant_addons` | add-on registry and per-tenant enabled flag (settings live in the tenant DB) |
| `usage_summaries` | tenant_id, day, bookings, messages, page_views (if tracked), media_bytes, db_bytes, rows, chatbot_enabled, updated_at |
| `provisioning_jobs` | id, tenant_id, kind `create\|delete\|move`, steps JSON (name, status, started/finished, error), status |
| `migration_runs` | per-DB report rows from `migrate:all` |

### 5.2 TenantDbResolver

```ts
interface TenantDbResolver {
  forTenant(t: { id: string; db: TenantDbLocator }): Promise<Db>;   // cached connection/handle
}
```

- **Host resolution and DB locator are one platform query:** `domains ⋈ tenants ⋈ tenant_databases` by hostname. The result is cached in isolate/process memory for 60 s, and the cache drops on tenant version change. **In steady state there are zero extra queries per request**, because the tenant lookup sits in front of the existing page cache.
- **Cloudflare:** `d1` resolver; the locator holds a binding name (`TENANT_<id>`), and the handle is `env[binding]`. Shared-mode tenants use the `POOL_1` binding.
- **Node:**
  - `postgres` keeps an LRU of pools, one per tenant database (max open pools and idle timeout configurable). Shared tenants use one pooled database.
  - `mysql` uses one pool per server with `withSchema(<db>)` per tenant.
  - `sqlite` uses a file per tenant (`data/tenants/<id>.db`).
- **App code never sees which one is in use.** `locals.ctx = { tenantId, db }` is built in `hooks.server.ts`.
- **Safety in every mode:** every tenant repository query is scoped by `tenant_id` (`tenant-scope.ts`). The isolation test suite runs against a shared pool holding 2 tenants **and** against dedicated DBs.

### 5.3 Bindings and the free-plan cap

- **`wrangler.toml` is generated** by `scripts/cf/gen-wrangler.ts` from the platform DB registry: the platform DB, the shared pool(s) and one `[[d1_databases]]` per dedicated tenant. A committed `wrangler.base.toml` holds everything else. The generated file is git-ignored, so the live production D1 id is no longer committed.
- **Free plan: 10 D1 databases per account.** With the platform DB plus one shared pool, that leaves **8 dedicated clients**.
  - The super admin shows `used/10` and warns at 8 used.
  - It blocks dedicated provisioning at 10 and suggests shared mode or upgrading. The cap is configurable for paid accounts.
- **A new dedicated client needs a redeploy**, because D1 bindings are fixed at deploy time on Workers. There's no way around this on the free plan without the slow D1 HTTP API. See Q3 for how the deploy is triggered.

### 5.4 Provisioning — `npm run tenant:create` and super admin "Add client"

Steps run as a `provisioning_jobs` state machine with live progress in the super admin. Each step is idempotent and has an undo:

| # | Step | Undo |
| --- | --- | --- |
| 1 | Validate slug/name; check the D1 cap | — |
| 2 | Create DB: D1 via Cloudflare API `POST /accounts/:id/d1/database` / `CREATE DATABASE` on PG/MySQL / new file on SQLite. Shared mode skips this. | delete DB |
| 3 | Run tenant migrations | (dropped with DB) |
| 4 | Seed the template's sample data (+ copy sample media to FileStorage) | delete `t/<id>/` media |
| 5 | Register `tenants`, `tenant_databases`, default subdomain in the platform DB (status `provisioning`) | delete rows |
| 6 | Cloudflare only: regenerate the wrangler config, then deploy (see Q3) | redeploy without binding |
| 7 | Health check (`GET /` on the subdomain through the new binding) → status `ready` | — |

A failure at any step runs the undo steps in reverse and marks the job `failed` with the error. The CLI runs the same code.

**Delete client:**
1. Final `data:export --tenant` to backup storage (kept per retention).
2. Remove custom hostnames (DomainProvider) and domains.
3. Remove the binding, then redeploy.
4. Delete the DB.
5. Delete media.
6. Delete the platform rows.

Step 1 must succeed before anything is deleted.

### 5.5 Moving between dedicated and shared

`npm run tenant:move -- --tenant <slug> --to dedicated|shared`:
1. Set the tenant to read-only. The site keeps serving; admin edits and bookings get a short "maintenance" message, typically for well under a minute.
2. Export.
3. Import into the target.
4. **Verify:** per-table counts + hashes match.
5. Switch the registry.
6. Clear caches.
7. Leave the old copy for 7 days (`--purge-source` removes it earlier).

### 5.6 Operations

- **Backups:** `npm run backup:run` exports every DB (or `--tenant`) to the backup FileStorage under `backups/<tenant>/<stamp>/`. Retention is `BACKUP_RETENTION_DAYS` (default 14).
  - On Cloudflare it runs from a **scheduled GitHub Actions workflow**. A Worker cron would hit the 10 ms CPU limit exporting a whole database.
  - On Docker it runs from the `cron` container.
  - D1 Time Travel (7 days on free) is an extra safety net.
- **Usage summaries:** a cron job (Cloudflare Cron Trigger / Docker cron) runs a few cheap `COUNT` queries per tenant, batched, and writes `usage_summaries`. Super-admin dashboards read only `usage_summaries`.

---

## 6. Server and cloud independence

### 6.1 Ports and adapters — `src/lib/server/platform/<provider>/`

| Port | Adapters now | Selected by |
| --- | --- | --- |
| `Config` (single module reading env; secrets only from env) | — | `src/lib/server/config.ts` |
| `TenantDbResolver` + dialects | `cloudflare` (D1), `node` (sqlite, postgres, mysql, mssql) | `DB_DIALECT`, `DATABASE_URL`, `PLATFORM_DATABASE_URL` / bindings |
| `FileStorage` | `r2`, `d1` (current chunk driver), `s3` (AWS S3, GCS interop, MinIO, Backblaze), `azure` (Blob), `local` | `STORAGE_PROVIDER` |
| `Email` | `resend` (fetch), `smtp` (Node only), `ses` (fetch + SigV4 via aws4fetch), `none` | `EMAIL_PROVIDER` |
| `Cache` (page cache) | `cf-cache-api`, `memory` | `CACHE_PROVIDER` |
| `RateLimiter` | `db` (current, per tenant DB) | `RATE_LIMIT_PROVIDER` |
| `Jobs/Scheduler` (`background()`, cron handlers) | `cf` (waitUntil + Cron Triggers), `node` (in-process + cron container) | target |
| `DomainProvider` | `cloudflare-saas`, `caddy` (on-demand TLS `ask` endpoint), `manual` | `DOMAIN_PROVIDER` |
| `RequestInfo` (client IP, country) | `cf` (`cf-connecting-ip`, `cf-ipcountry`), `node` (`getClientAddress` + trusted `X-Forwarded-For` depth) | target |
| `Captcha` | `turnstile`, `none` | `CAPTCHA_PROVIDER` |
| `ChatbotTransport` (add-on) | `http`, `cf-service-binding` | add-on setting |

- **Build-time selection:**
  - `vite.config.ts` aliases `#platform` to `src/lib/server/platform/entry.cloudflare.ts` or `entry.node.ts`.
  - The Cloudflare entry statically imports **only** `cloudflare/*` adapters plus the fetch-based ones (`s3`, `resend`, `ses`, `azure` are all fetch + Web Crypto, so no SDKs are needed).
  - The Node entry adds `better-sqlite3`, `pg`, `mysql2`, `tedious`, `nodemailer` and `fs`.
  - A CI check fails if the Worker bundle contains any of those package names, and it reports the bundle size from `wrangler deploy --dry-run` on every step.
- **Media URLs are always `/media/<public key>`** on the tenant's domain, served through the app from whichever FileStorage is configured. `MEDIA_PUBLIC_BASE_URL` is removed because it would expose a bucket hostname.

### 6.2 Docker (no Cloudflare)

- **`docker-compose.yml`:**
  - `app` (adapter-node), `postgres` (platform DB + one database per dedicated tenant + a shared pool DB), `minio` (S3 storage) and `caddy`.
  - Caddy uses **on-demand TLS**: the `ask` endpoint `/_internal/domain-allowed` checks the `domains` table, so any client domain gets a certificate automatically.
  - `cron` handles backups and usage summaries.
  - `npm run tenant:create` works the same here (creating Postgres databases instead of D1).
- **`docker-compose.test.yml`:** Postgres + MySQL for the dialect test suite.

### 6.3 Free-plan budgets (checked each step)

| Budget | Limit | How we stay inside |
| --- | --- | --- |
| Bundle | 3 MB gzip | 440 KiB today. Kysely core is about 30 KiB gzip, and the D1 dialect is tiny. Reported every step. |
| CPU | 10 ms per request | Kysely compiles queries cheaply. Page cache hits skip SSR entirely. Measured on a staging Worker (Q6). |
| Queries per invocation | 50 | Homepage ~15 today. Tenant lookup is cached, so 0 extra. The repository query-count test enforces it. |
| D1 rows read/written per day | 5 M / 100 k | Unchanged per tenant, now split across DBs. |
| D1 databases | 10 | Cap logic in §5.3. |
| Cron Triggers | 5 per account | 2 used (webhook retries + usage summaries). |

---

## 7. (C) Add-on framework and chatbot add-on

### 7.1 Framework — `src/lib/addons/` + `src/lib/server/addons/`

```
addons/
  registry.ts                 all add-ons compiled in; build-time glob of addons/*/manifest.ts
  chatbot/
    manifest.ts               id, name, version, settingsSchema (zod), secretFields, requiredScopes, clientVisible fields
    server.ts                 hooks: routes (/assistant/*), onPublish, headInjection, csp additions
    loader.ts                 1 KB public loader script
```

- **Enable/disable:**
  - Turned on or off per tenant in `tenant_addons`, by the super admin only, and **disabled by default**.
  - When disabled, the add-on registers no routes for that tenant (404) and injects nothing into pages.
  - It also adds no CSP entries and no JS weight, because the loader is only referenced when enabled.
- **Settings and secrets:**
  - Settings live in the tenant DB (`addon_settings`), validated by the manifest's Zod schema.
  - Secret fields are **AES-256-GCM encrypted** with `SECRETS_ENCRYPTION_KEY` (env). The key id is stored alongside each value, which allows rotation (`npm run secrets:rotate`).
- **Scopes:** an add-on's required API scopes are used to create its tenant-scoped API key automatically when it's enabled.

### 7.2 Chatbot add-on

- **Super-admin settings per tenant:**
  - enabled, chatbot server URL (or service binding name), bot id;
  - public widget key, if the chatbot adds one;
  - position;
  - colours, which default to the tenant's theme;
  - welcome message;
  - page rules (all / include list / exclude list, e.g. hide on `/book`);
  - "client may see analytics link" + URL.
- **Client admin** sees a read-only card: "Chat assistant: On/Off", plus the analytics link if you allowed it.
- **White-label loading (all same-origin on the tenant domain):**
  - `GET /assistant/widget.js` is proxied from the chatbot server, cached at the edge for 1 h, with the tenant's CSP nonce.
  - `GET /assistant/loader.js` is our loader. It fetches `/assistant/api/config`, then calls `WebsiteAssistant.mount({ config, apiBase: '/assistant' })`.
  - `GET /assistant/api/config` proxies the chatbot config. The proxy rewrites `client_id` → `"site"`, forces `powered_by` off, and rewrites asset URLs to `/assistant/api/asset/*`.
  - `POST /assistant/api/chat` and `/assistant/api/chat/stream` proxy the chat calls. Streaming is passed through. The proxy injects the bot id and sends `Origin` as the tenant's primary domain, so the chatbot's allowed-domains check keeps working.
  - It also applies our own per-visitor rate limit, using the real client IP from the RequestInfo port.
- **Failure handling:**
  - Proxy timeouts are 3 s for config and 30 s for chat.
  - If the chatbot is down, the loader gets a 204 or an error and **does nothing**. No bubble appears and no error is logged.
  - The page itself never waits on the chatbot, because the loader is `defer` and runs after load.
- **Content feed** `GET /api/v1/content`, with scope `content:feed` on a tenant-scoped key:
  - Returns published pages (text), services, doctors, branches with hours/phones/map links, FAQs and contact details.
  - Includes `updatedAt` and an `ETag` (the content version). It answers `If-None-Match` with `304`, so the chatbot re-syncs only when something changed.
- **On Publish:** if enabled, the site sends an HMAC-signed webhook `content.published` (the existing webhook system, with retries) to the chatbot's re-index URL. *This needs a matching endpoint in the chatbot (Q8). Until then, sitemap crawling works.*
- **Booking API** (`/api/v1`, tenant-scoped keys that the super admin can create, revoke and **rotate**, with a grace period for the old key):
  - `GET /locations`, `GET /services`, `GET /doctors?location=`
  - `GET /availability?location=&doctor=&date=`
  - `POST /appointments` (`source: "chatbot"`): same Zod validation, rate limits and notifications as the website form, and the same `createAppointment()`.
  - `POST /appointments/{reference}/cancel` (new): phone-number check, same notifications.
  - Spec in **`docs/api/openapi.yaml`** (and served at `/api/v1/openapi.json`, so the chatbot's "Import from API" picks it up).
- **Isolation:** an API key is looked up only in the DB of the tenant resolved from the Host header. A key from tenant A therefore can't even be found on tenant B's host. A test asserts the 401.

---

## 8. Build order (small steps; each ends green and is pushed)

**Gate after every step:**
- `npm run check`;
- unit tests;
- **repository suite on sqlite, d1, postgres and mysql**;
- Playwright e2e and a11y;
- screenshot diff against the baseline (≤ 0.1%);
- **Cloudflare build** + bundle report;
- **Docker build** + smoke test.

From R5 onwards, the run also uses **2 dedicated tenants + 1 shared tenant (one with the chatbot add-on, against a mock chatbot server)** on `wrangler dev` (local D1) and on Docker/Postgres.

| Step | Contents | Behaviour change |
| --- | --- | --- |
| **R0 Baselines** | Playwright screenshots (12 pages × mobile/desktop), query counts per page, bundle size, staging CPU numbers (if Q6) | none |
| **R1 Config + ports** | `config.ts`; move `target/*` + `storage/*` + email into `platform/<provider>/` behind the interfaces in §6.1; RequestInfo replaces `cf-connecting-ip`; Captcha port; build-time entries; bundle guard | none |
| **R2 Kysely + repositories** | portable schema helpers, D1/SQLite/PG/MySQL dialects, `/migrations` (tenant baseline = today's schema + `tenant_id` + `booking_slot_locks`), all 52 files moved onto repositories, Drizzle removed, dialect test suite + CI matrix | none (single site, one implicit tenant) |
| **R3 Export/import** | `data:export` / `data:import`, round-trip test D1 → PG → MySQL → D1 | none |
| **R4 Docker + storage adapters** | compose (app + Postgres + MinIO + Caddy + cron), `s3`/`azure`/`local`/`r2` storage, `ses` email, Node entry | none |
| **R5 Platform DB + tenancy** | platform migrations, host → tenant resolution, TenantDbResolver (dedicated + shared), `tenant-scope.ts`, primary-domain 301s, generated wrangler config, isolation tests | multi-tenant routing |
| **R6 Provisioning + ops + super admin** | console host, clients CRUD/suspend/delete, provisioning jobs, D1 cap warnings, `tenant:create/delete/move`, `db:migrate:all`, backups workflow, usage summaries, schema version per tenant | new super admin |
| **R7 Templates + site editor** | PLATFORM_PLAN §6/§8: Dental Template 1 extraction (screenshots must match), manifests, tenant pages/sections, draft/preview/publish, client login on own domain, client staff role, per-tenant bookings | editor; sites look identical |
| **R8 Domains + white-label** | Cloudflare for SaaS + Caddy domain adapters, DNS instructions + verification, redirect mode, per-tenant SEO files/favicon, email branding, white-label crawler test | — |
| **R9 Add-ons + chatbot** | framework, encrypted secrets (incl. existing secret settings), chatbot add-on + proxy, content feed, publish webhook, booking API cancel + key rotation, `docs/api/openapi.yaml` | new add-on (off by default) |
| **R10 More templates** | Dental Template 2, Eye Clinic Template 1 — folders only | — |
| **R11 Docs** | `docs/MIGRATION.md` (AWS, Azure, GCP, VPS, DB→DB, one client to own server), `docs/ADDING_A_PROVIDER.md`, `docs/ADDING_AN_ADDON.md`, `docs/ADDING_TEMPLATES.md`, README (each target, add a client, migrate all tenants). The README is also updated in every step. | — |

R1–R4 make the existing single site portable before any tenancy is added, so each later step builds on a tested base. The site looks and behaves the same after each of them.

---

## 9. Decisions needed before R1

PLATFORM_PLAN.md's open questions still apply. They're repeated here with the changes this brief brings.

| # | Decision | Recommendation |
| --- | --- | --- |
| **Q1** | **File storage on Cloudflare.** R2 has 10 GB free, but **enabling R2 requires a payment method** on the account. Alternatively, keep the current D1-chunk driver: with a database per tenant, each client now has its own 500 MB, but all databases share 5 GB per account. | **D1 chunks as the free-plan default, R2 adapter built and switchable** (`STORAGE_PROVIDER=r2`) once you add a card. Public URLs are the same either way. |
| **Q2** | **Platform domain** (base for subdomains, console host, CNAME target). It must be a zone on your Cloudflare account. | A neutral domain unrelated to your brand, with `console.` and `sites.` subdomains. |
| **Q3** | **How a new dedicated client gets deployed** (bindings require a redeploy): the super admin triggers a GitHub Actions `workflow_dispatch` (needs a fine-grained GitHub token stored as a Worker secret), *or* only the CLI deploys. | **GitHub Actions dispatch.** The super admin then shows deploy progress. |
| **Q4** | **D1 slot plan** on the free account (10): platform + 1 shared pool + 8 dedicated. Which real clients start as dedicated? | Orchid = dedicated, demo/small = shared. |
| **Q5** | **Orchid content source:** read-only `wrangler d1 export` of the live DB, or the seed profile in this repo. | Live export (read-only; I'll ask before running it). |
| **Q6** | **CPU measurement** needs a **staging Worker on your Cloudflare account** (e.g. `clinic-platform-staging` with its own empty D1). It's the only way to see real CPU time against the 10 ms limit. | Yes, staging Worker; I'll ask for an API token or have you run `wrangler login`. |
| **Q7** | **Postgres layout for dedicated tenants:** database per tenant (strongest isolation, simplest export) or schema per tenant (one pool, lighter). | **Database per tenant**, with a pool LRU. |
| **Q8** | **Changes needed in your chatbot repos** (separate from this repo): (a) trust a signed forwarded-client-IP header from the platform proxy, without which all visitors share the 20 msg/min per-IP limit; (b) a machine endpoint `POST /api/integrations/reindex` (HMAC) and optionally "JSON feed" as a content source; (c) optional neutral DOM attribute name instead of `data-website-assistant`. Should I open PRs on `Chatbot_CloudFlare` (and the self-hosted `Chatbot`), or will you make these changes? | **I open small PRs** after R9's contract is final. Until (a) lands, the add-on ships but warns in the super admin. |
| **Q9** | **SQL Server in the CI test matrix?** Kysely supports it and the schema is designed for it, but the SQL Server Docker image is large (~1.5 GB) and slow in CI. | Keep it **optional** (manual workflow), required: SQLite, D1, Postgres, MySQL. |
| **Q10** | Draft/publish scope, email sender, extras (PLATFORM_PLAN D4, D6, D7). | Same as recommended there. |

Once you approve (with answers), I start R0 → R1.
