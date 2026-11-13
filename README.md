# Clinic Website (white-label)

The official website for a clinic, managed from an admin panel: branches, doctors, services, certifications and a simple appointment-request feature. One codebase serves any kind of clinic (dental, eye, skin, physiotherapy, general practice) by changing settings and content only.

First client: **Orchid Dental Care**.

- **Stack:** SvelteKit 3 (Svelte 5 runes), TypeScript (strict), Tailwind CSS 4, Drizzle ORM (SQLite dialect), Zod
- **Runs on:** Cloudflare Workers free tier (D1 + R2 + Turnstile), **or** any Linux server (Node + SQLite file + local disk/S3)
- **Same code for both:** `DEPLOY_TARGET=cloudflare|node` picks the adapter and the platform module at build time

> Status: Phases 1–5 complete (foundation, content, public website, booking, integrations). See [Build phases](#build-phases).

---

## Quick start (local, no Cloudflare account needed)

Requirements: Node 20.19+ (22 recommended).

```bash
npm install
npm run seed -- --profile=dental            # demo content (creates ./data/clinic.db)
npm run create-admin -- --email=you@example.com --password='a-long-password'
npm run dev                                  # http://localhost:5173  → /admin
```

Or skip `create-admin` and open `/admin` — with no users, you are sent to a one-time setup screen.

Seed profiles: `dental`, `eye`, `skin`, `general`, `physio`, `other`. Re-running the seed replaces content but keeps users, API keys and webhooks. Use `--name="Clinic Name"` to set the clinic name.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, local SQLite + local disk storage |
| `npm run dev:cf` | Dev server with Cloudflare bindings emulated (D1/R2 via wrangler) |
| `npm run build:node` / `npm start` | Build and run the Node server (`build/`) |
| `npm run build:cf` | Build the Cloudflare Worker (`.svelte-kit/cloudflare`) |
| `npm run preview:cf` | Build for Cloudflare and run it locally with `wrangler dev` |
| `npm run deploy:cf` | Build, apply D1 migrations, deploy to Cloudflare |
| `npm run seed -- --profile=dental` | Load demo content (add `--sql=seed.sql` to produce SQL for D1) |
| `npm run create-admin -- --email=…` | Create/reset a super admin (add `--sql=admin.sql` for D1) |
| `npm run db:generate` | Generate a new migration after editing `src/lib/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the local SQLite file |
| `npm run check` | Type-check (svelte-check) |
| `npm run test:unit` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |

## Environment variables

All optional — see [`.env.example`](.env.example) for the full, documented list. Environment values override matching admin settings (e.g. Turnstile and email keys).

## Architecture

```
src/
  env.ts                      environment variable declarations ($app/env/private)
  hooks.server.ts             db + settings per request, sessions, admin guard, page cache, CSP/security headers
  lib/
    types.ts                  shared types (hours, image refs, roles, statuses)
    permissions.ts            role → permission matrix (server-enforced)
    settings/schema.ts        all clinic settings (Zod, with defaults)
    content/collections.ts    simple content lists (FAQs, testimonials, …) declared once → admin forms + validation
    server/
      platform.ts             the ONLY entry point to db/storage/email/cache for feature code
      target/node.ts          better-sqlite3, local disk/S3, SMTP, in-memory page cache
      target/cloudflare.ts    D1, R2, Cache API
      db/schema.ts            Drizzle schema (portable SQLite)
      storage/                R2, S3-compatible (aws4fetch), local disk
      email/                  Resend (HTTP) + SMTP (node only), templates
      auth.ts, crypto.ts      sessions (DB-backed, HTTP-only cookie), PBKDF2 via Web Crypto
      settings.ts             load/save settings, secret stripping, cache version
    admin/                    admin UI components
    components/               public UI components
scripts/                      seed, create-admin, migrate, demo assets
drizzle/                      SQL migrations (used by drizzle and by `wrangler d1 migrations apply`)
```

Key decisions:

- **One deployment = one clinic.** Everything clinic-specific is in the database.
- **No Node-only code on Workers.** Passwords use PBKDF2 (Web Crypto, 100k iterations — the Workers maximum). Images are resized and converted to WebP **in the browser** before upload.
- **`#target` alias.** `vite.config.ts` maps `#target` to `target/node.ts` or `target/cloudflare.ts`, so the Cloudflare bundle never contains `better-sqlite3`, `nodemailer` or `fs`.
- **Settings are JSON rows** validated by Zod with defaults, so a fresh database renders a working site and new settings need no migration.
- **Secrets** (email/Turnstile/API tokens) are never sent to the browser; forms show "saved — leave blank to keep".
- **Page cache:** anonymous GET pages are cached (Cache API on Cloudflare, memory on Node) under a content-version key that changes whenever anything is edited — that is the "purge on change".

## Roles

| Role | Can do |
| --- | --- |
| Super admin | Everything, including settings, users, integrations |
| Clinic admin | All content and all appointments |
| Branch staff | Appointments for their assigned branch(es) only; read-only content |

Every admin load/action checks permissions on the server (`requirePermission`), and `hooks.server.ts` additionally blocks unauthenticated access to `/admin/*`. All changes are written to the audit log.

## Build phases

1. **Foundation** ✅ — project setup, both adapters, db/storage/email providers, schema + migrations, auth and roles, admin layout, settings and branding (CSS variables), seed script.
2. **Content management** ✅ — locations (Google Maps), doctors (photos, per-branch schedules), services, certifications, hero slides, media library, homepage sections, testimonials, FAQs, pages.
3. **Public website** ✅ — all pages and homepage sections, cross-fading hero, sticky header + mobile bar, SEO/JSON-LD, sitemap.
4. **Booking** ✅ — request flow (branch → doctor → day/time → details), optional live slots per branch with double-booking protection, notifications, admin list/detail/calendar, add-by-phone, CSV export, contact inbox.
5. **Integrations** ✅ — REST API + OpenAPI, scoped API keys, signed webhooks with retries, integration/notification adapters, chatbot module.
6. Deployment and hardening.
