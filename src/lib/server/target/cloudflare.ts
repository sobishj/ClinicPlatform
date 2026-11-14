/**
 * Platform implementation for Cloudflare Workers (adapter-cloudflare).
 * Uses only Web APIs and bindings: D1 for data and uploaded files, Cache API.
 *
 * Databases:
 *  - PLATFORM_DB          clients, domains, console users
 *  - TENANT_<anything>    one D1 database per client. Bindings are fixed at deploy time, so
 *                         spare TENANT_* bindings are declared in wrangler.toml ahead of time
 *                         ("slots"); the console assigns a free slot when a client is added.
 *
 * SvelteKit 3's adapter no longer passes `platform` to requests; bindings and waitUntil come
 * from the `cloudflare:workers` module instead. `platform` is still preferred when present.
 */
import { env as workerEnv, waitUntil as workerWaitUntil } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { schema, type DB } from '../db/index.js';
import { platformSchema, type PlatformDB } from '../platform-db/index.js';
import { migrate } from '../db/migrator.js';
import { TENANT_MIGRATIONS, PLATFORM_MIGRATIONS } from '../db/migrations.js';
import type { Storage } from '../storage/types.js';
import { d1Storage } from '../storage/d1.js';
import type { EmailProvider, ResolvedEmailConfig } from '../email/types.js';

export const TARGET = 'cloudflare' as const;

type D1Like = { prepare: unknown; batch: unknown; exec: unknown };
const bindings = (platform?: App.Platform): Record<string, unknown> =>
	(platform?.env as Record<string, unknown> | undefined) ??
	(workerEnv as unknown as Record<string, unknown>);
const isD1Binding = (v: unknown): v is D1Like =>
	!!v &&
	typeof v === 'object' &&
	typeof (v as D1Like).prepare === 'function' &&
	typeof (v as D1Like).exec === 'function';

/** Migrations are checked once per isolate per database. */
const ready = new WeakMap<object, Promise<unknown>>();

function open<T>(
	binding: D1Like,
	s: Record<string, unknown>,
	migrations: Parameters<typeof migrate>[1]
): Promise<T> {
	let p = ready.get(binding);
	if (!p) {
		const db = drizzle(binding as never, { schema: s });
		p = migrate(db as never, migrations).then(() => db);
		p.catch(() => ready.delete(binding));
		ready.set(binding, p);
	}
	return p as Promise<T>;
}

export function getPlatformDb(platform?: App.Platform): Promise<PlatformDB> {
	const binding = bindings(platform).PLATFORM_DB;
	if (!isD1Binding(binding))
		throw new Error('D1 binding "PLATFORM_DB" is missing. Check wrangler.toml.');
	return open<PlatformDB>(binding, platformSchema, PLATFORM_MIGRATIONS);
}

export function getTenantDb(platform: App.Platform | undefined, dbRef: string): Promise<DB> {
	const binding = /^TENANT_[A-Z0-9_]+$/.test(dbRef) ? bindings(platform)[dbRef] : undefined;
	if (!isD1Binding(binding))
		throw new Error(`D1 binding "${dbRef}" is missing. Check wrangler.toml.`);
	return open<DB>(binding, schema, TENANT_MIGRATIONS);
}

/** Names of all TENANT_* D1 bindings in this deployment (assigned or free). */
export function databaseSlots(platform?: App.Platform): string[] {
	return Object.entries(bindings(platform))
		.filter(([name, v]) => /^TENANT_[A-Z0-9_]+$/.test(name) && isD1Binding(v))
		.map(([name]) => name)
		.sort();
}

/** A client database on Cloudflare is a pre-declared slot. Returns the slot as the reference. */
export async function createTenantDatabase(
	platform: App.Platform | undefined,
	_tenantId: string,
	slot?: string
): Promise<string> {
	if (!slot || !databaseSlots(platform).includes(slot))
		throw new Error('Choose a free database slot.');
	return slot;
}

/** The slot stays declared in wrangler.toml; its data is wiped when it is assigned again. */
export async function retireTenantDatabase(
	_platform: App.Platform | undefined,
	_dbRef: string
): Promise<void> {}

export function getStorage(
	_platform: App.Platform | undefined,
	tenant: { id: string; db: DB }
): Storage {
	return d1Storage(tenant.db);
}

export async function getSmtpProvider(_cfg: ResolvedEmailConfig): Promise<EmailProvider | null> {
	console.warn('SMTP is not supported on Cloudflare Workers; use Resend instead.');
	return null;
}

export function waitUntil(platform: App.Platform | undefined, promise: Promise<unknown>) {
	const p = promise.catch((err) => console.error('[background]', err));
	if (platform?.ctx) platform.ctx.waitUntil(p);
	else workerWaitUntil(p);
}

const CACHE_HOST = 'https://page-cache.internal';
const defaultCache = () =>
	(globalThis as unknown as { caches?: { default: Cache } }).caches?.default;

export async function cacheGet(
	_platform: App.Platform | undefined,
	key: string
): Promise<Response | null> {
	const cache = defaultCache();
	if (!cache) return null;
	const hit = (await cache.match(new Request(CACHE_HOST + key))) as unknown as Response | undefined;
	if (!hit) return null;
	// Responses from the Cache API have immutable headers; copy into a mutable Response
	// so later code (security headers, nonce refresh) can still set headers.
	return new Response(hit.body, {
		status: hit.status,
		statusText: hit.statusText,
		headers: new Headers(hit.headers)
	});
}

export async function cachePut(
	platform: App.Platform | undefined,
	key: string,
	response: Response,
	ttlSeconds: number
) {
	const cache = defaultCache();
	if (!cache) return;
	const copy = new Response(response.body, response);
	// Edge-cache lifetime; keep immutable for media, otherwise a short TTL.
	const immutable = /immutable/.test(response.headers.get('cache-control') ?? '');
	copy.headers.set(
		'cache-control',
		`public, max-age=${ttlSeconds}${immutable ? ', immutable' : ''}`
	);
	copy.headers.delete('set-cookie');
	waitUntil(platform, cache.put(new Request(CACHE_HOST + key), copy as never));
}
