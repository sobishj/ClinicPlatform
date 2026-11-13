/**
 * Platform implementation for the dedicated-server build (adapter-node).
 * Selected at build time via the `#target` alias in vite.config.ts — never imported on Cloudflare.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
	DATABASE_PATH,
	STORAGE_DRIVER,
	UPLOAD_DIR,
	S3_ENDPOINT,
	S3_BUCKET,
	S3_REGION,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY
} from '$app/env/private';
import { schema, type DB } from '../db/index.js';
import { type Storage, mimeFromKey } from '../storage/types.js';
import { s3Storage } from '../storage/s3.js';
import type { EmailProvider, ResolvedEmailConfig } from '../email/types.js';

export const TARGET = 'node' as const;

let db: DB | undefined;

export function getDb(_platform?: App.Platform): DB {
	if (db) return db;
	const file = path.resolve(DATABASE_PATH ?? './data/clinic.db');
	mkdirSync(path.dirname(file), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	const instance = drizzle(sqlite, { schema });
	const migrationsFolder = path.resolve(process.env.MIGRATIONS_DIR ?? './drizzle');
	if (existsSync(migrationsFolder)) migrate(instance, { migrationsFolder });
	db = instance as unknown as DB;
	return db;
}

let storage: Storage | undefined;

export function getStorage(_platform?: App.Platform): Storage {
	if (storage) return storage;
	if (STORAGE_DRIVER === 's3' && S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
		storage = s3Storage({
			endpoint: S3_ENDPOINT,
			bucket: S3_BUCKET,
			region: S3_REGION,
			accessKeyId: S3_ACCESS_KEY_ID,
			secretAccessKey: S3_SECRET_ACCESS_KEY
		});
	} else {
		storage = localStorage(path.resolve(UPLOAD_DIR ?? './data/uploads'));
	}
	return storage;
}

function localStorage(root: string): Storage {
	const resolve = (key: string) => {
		const full = path.resolve(root, key);
		if (!full.startsWith(root + path.sep)) throw new Error('Invalid storage key');
		return full;
	};
	return {
		driver: 'local',
		async put(key, data) {
			const file = resolve(key);
			await mkdir(path.dirname(file), { recursive: true });
			await writeFile(file, data instanceof Uint8Array ? data : new Uint8Array(data));
		},
		async get(key) {
			try {
				const buf = await readFile(resolve(key));
				return { body: new Uint8Array(buf), contentType: mimeFromKey(key), size: buf.byteLength };
			} catch {
				return null;
			}
		},
		async delete(key) {
			await unlink(resolve(key)).catch(() => {});
		},
		async list(prefix = '') {
			const out: string[] = [];
			async function walk(dir: string) {
				let entries;
				try {
					entries = await readdir(dir, { withFileTypes: true });
				} catch {
					return;
				}
				for (const e of entries) {
					const full = path.join(dir, e.name);
					if (e.isDirectory()) await walk(full);
					else out.push(path.relative(root, full).split(path.sep).join('/'));
				}
			}
			await walk(root);
			return out.filter((k) => k.startsWith(prefix));
		}
	};
}

/** SMTP is only available on the server build (Workers cannot use nodemailer). */
export async function getSmtpProvider(cfg: ResolvedEmailConfig): Promise<EmailProvider | null> {
	if (!cfg.smtp?.host) return null;
	const nodemailer = await import('nodemailer');
	const transport = nodemailer.createTransport({
		host: cfg.smtp.host,
		port: cfg.smtp.port,
		secure: cfg.smtp.secure,
		auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined
	});
	return {
		name: 'smtp',
		async send(msg) {
			await transport.sendMail({
				from: cfg.from,
				to: msg.to,
				subject: msg.subject,
				html: msg.html,
				text: msg.text,
				replyTo: msg.replyTo ?? cfg.replyTo
			});
		}
	};
}

/** Background work: on Node we just let the promise run. */
export function waitUntil(_platform: App.Platform | undefined, promise: Promise<unknown>) {
	promise.catch((err) => console.error('[background]', err));
}

/** Page cache (anonymous GETs). In-memory, bounded. */
const memoryCache = new Map<string, { body: string; headers: [string, string][]; status: number; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

export async function cacheGet(_platform: App.Platform | undefined, key: string): Promise<Response | null> {
	const hit = memoryCache.get(key);
	if (!hit) return null;
	if (hit.expires < Date.now()) {
		memoryCache.delete(key);
		return null;
	}
	return new Response(hit.body, { status: hit.status, headers: hit.headers });
}

export async function cachePut(
	_platform: App.Platform | undefined,
	key: string,
	response: Response,
	ttlSeconds: number
) {
	if (memoryCache.size >= MAX_CACHE_ENTRIES) {
		const first = memoryCache.keys().next().value;
		if (first) memoryCache.delete(first);
	}
	const body = await response.text();
	memoryCache.set(key, {
		body,
		status: response.status,
		headers: [...response.headers.entries()],
		expires: Date.now() + ttlSeconds * 1000
	});
}
