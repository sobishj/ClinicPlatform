/**
 * Platform implementation for Cloudflare Workers (adapter-cloudflare).
 * Uses only Web APIs and bindings: D1 (env.DB), R2 (env.MEDIA), Cache API.
 */
import { drizzle } from 'drizzle-orm/d1';
import { schema, type DB } from '../db/index.js';
import { type Storage, nullStorage } from '../storage/types.js';
import { r2Storage } from '../storage/r2.js';
import type { EmailProvider, ResolvedEmailConfig } from '../email/types.js';

export const TARGET = 'cloudflare' as const;

const dbCache = new WeakMap<object, DB>();

export function getDb(platform?: App.Platform): DB {
	const binding = platform?.env?.DB;
	if (!binding) throw new Error('D1 binding "DB" is missing. Check wrangler.toml.');
	let db = dbCache.get(binding);
	if (!db) {
		db = drizzle(binding, { schema });
		dbCache.set(binding, db);
	}
	return db;
}

export function getStorage(platform?: App.Platform): Storage {
	const bucket = platform?.env?.MEDIA;
	return bucket ? r2Storage(bucket) : nullStorage;
}

export async function getSmtpProvider(_cfg: ResolvedEmailConfig): Promise<EmailProvider | null> {
	console.warn('SMTP is not supported on Cloudflare Workers; use Resend instead.');
	return null;
}

export function waitUntil(platform: App.Platform | undefined, promise: Promise<unknown>) {
	const p = promise.catch((err) => console.error('[background]', err));
	platform?.ctx?.waitUntil(p);
}

const CACHE_HOST = 'https://page-cache.internal';

export async function cacheGet(_platform: App.Platform | undefined, key: string): Promise<Response | null> {
	const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
	if (!cache) return null;
	const hit = await cache.match(new Request(CACHE_HOST + key));
	return hit ?? null;
}

export async function cachePut(
	platform: App.Platform | undefined,
	key: string,
	response: Response,
	ttlSeconds: number
) {
	const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
	if (!cache) return;
	const copy = new Response(response.body, response);
	copy.headers.set('cache-control', `public, max-age=${ttlSeconds}`);
	copy.headers.delete('set-cookie');
	const put = cache.put(new Request(CACHE_HOST + key), copy);
	platform?.ctx?.waitUntil(put);
	await put;
}
