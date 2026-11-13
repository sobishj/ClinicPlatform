/**
 * Platform implementation for Cloudflare Workers (adapter-cloudflare).
 * Uses only Web APIs and bindings: D1 (env.DB), R2 (env.MEDIA), Cache API.
 *
 * SvelteKit 3's adapter no longer passes `platform` to requests; bindings and
 * waitUntil come from the `cloudflare:workers` module instead. `platform` is still
 * accepted (and preferred when present) for compatibility.
 */
import { env as workerEnv, waitUntil as workerWaitUntil } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { schema, type DB } from '../db/index.js';
import { type Storage, nullStorage } from '../storage/types.js';
import { r2Storage } from '../storage/r2.js';
import type { EmailProvider, ResolvedEmailConfig } from '../email/types.js';

export const TARGET = 'cloudflare' as const;

type Bindings = { DB?: App.Platform['env']['DB']; MEDIA?: R2Bucket };
const bindings = (platform?: App.Platform): Bindings => (platform?.env as Bindings | undefined) ?? (workerEnv as Bindings);

const dbCache = new WeakMap<object, DB>();

export function getDb(platform?: App.Platform): DB {
	const binding = bindings(platform).DB;
	if (!binding) throw new Error('D1 binding "DB" is missing. Check wrangler.toml.');
	let db = dbCache.get(binding);
	if (!db) {
		db = drizzle(binding, { schema });
		dbCache.set(binding, db);
	}
	return db;
}

export function getStorage(platform?: App.Platform): Storage {
	const bucket = bindings(platform).MEDIA;
	return bucket ? r2Storage(bucket) : nullStorage;
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
const defaultCache = () => (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;

export async function cacheGet(_platform: App.Platform | undefined, key: string): Promise<Response | null> {
	const cache = defaultCache();
	if (!cache) return null;
	const hit = await cache.match(new Request(CACHE_HOST + key));
	return (hit as unknown as Response) ?? null;
}

export async function cachePut(platform: App.Platform | undefined, key: string, response: Response, ttlSeconds: number) {
	const cache = defaultCache();
	if (!cache) return;
	const copy = new Response(response.body, response);
	copy.headers.set('cache-control', `public, max-age=${ttlSeconds}`);
	copy.headers.delete('set-cookie');
	waitUntil(platform, cache.put(new Request(CACHE_HOST + key), copy as never));
}
