/**
 * Platform implementation for the dedicated-server build (adapter-node).
 * Selected at build time via the `#target` alias in vite.config.ts — never imported on Cloudflare.
 *
 * Layout on disk (defaults):
 *   data/platform.db                     clients, domains, console users
 *   data/tenants/<tenant id>/site.db     one database per client
 *   data/tenants/<tenant id>/uploads/…   that client's uploaded files
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
	PLATFORM_DATABASE_PATH,
	TENANT_DATA_DIR,
	STORAGE_DRIVER,
	UPLOAD_DIR,
	S3_ENDPOINT,
	S3_BUCKET,
	S3_REGION,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY
} from '$app/env/private';
import { schema, type DB } from '../db/index.js';
import { platformSchema, type PlatformDB } from '../platform-db/index.js';
import { migrate } from '../db/migrator.js';
import { TENANT_MIGRATIONS, PLATFORM_MIGRATIONS } from '../db/migrations.js';
import { type Storage, mimeFromKey } from '../storage/types.js';
import { s3Storage } from '../storage/s3.js';
import type { EmailProvider, ResolvedEmailConfig } from '../email/types.js';

export const TARGET = 'node' as const;

const tenantRoot = () => path.resolve(TENANT_DATA_DIR ?? './data/tenants');
const SAFE_REF = /^[A-Za-z0-9_-]{1,80}$/;

function openSqlite(file: string) {
	mkdirSync(path.dirname(file), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	return sqlite;
}

let platformDb: Promise<PlatformDB> | undefined;

export function getPlatformDb(_platform?: App.Platform): Promise<PlatformDB> {
	platformDb ??= (async () => {
		const db = drizzle(openSqlite(path.resolve(PLATFORM_DATABASE_PATH ?? './data/platform.db')), {
			schema: platformSchema
		});
		await migrate(db as never, PLATFORM_MIGRATIONS);
		return db as unknown as PlatformDB;
	})();
	return platformDb;
}

const tenantDbs = new Map<string, { sqlite: Database.Database; db: Promise<DB> }>();

function tenantDbFile(dbRef: string): string {
	if (!SAFE_REF.test(dbRef)) throw new Error('Invalid database reference');
	return path.join(tenantRoot(), dbRef, 'site.db');
}

export function getTenantDb(_platform: App.Platform | undefined, dbRef: string): Promise<DB> {
	let entry = tenantDbs.get(dbRef);
	if (!entry) {
		const sqlite = openSqlite(tenantDbFile(dbRef));
		const instance = drizzle(sqlite, { schema });
		const db = migrate(instance as never, TENANT_MIGRATIONS).then(() => instance as unknown as DB);
		db.catch(() => tenantDbs.delete(dbRef));
		entry = { sqlite, db };
		tenantDbs.set(dbRef, entry);
	}
	return entry.db;
}

/** On a server, client databases are created on demand (no fixed slots). */
export function databaseSlots(_platform?: App.Platform): string[] | null {
	return null;
}

/** Reserve the database for a new client. Returns its reference (the file is created on first open). */
export async function createTenantDatabase(
	_platform: App.Platform | undefined,
	tenantId: string,
	_slot?: string
): Promise<string> {
	if (existsSync(tenantDbFile(tenantId)))
		throw new Error('A database for this client already exists.');
	return tenantId;
}

/** Remove a client's database and files. They are moved to <TENANT_DATA_DIR>/_deleted/, not erased. */
export async function retireTenantDatabase(
	_platform: App.Platform | undefined,
	dbRef: string
): Promise<void> {
	const entry = tenantDbs.get(dbRef);
	if (entry) {
		entry.sqlite.close();
		tenantDbs.delete(dbRef);
	}
	const dir = path.dirname(tenantDbFile(dbRef));
	if (!existsSync(dir)) return;
	const target = path.join(
		tenantRoot(),
		'_deleted',
		`${dbRef}-${new Date().toISOString().replace(/[:.]/g, '-')}`
	);
	mkdirSync(path.dirname(target), { recursive: true });
	renameSync(dir, target);
}

export function getStorage(
	_platform: App.Platform | undefined,
	tenant: { id: string; db: DB }
): Storage {
	if (!SAFE_REF.test(tenant.id)) throw new Error('Invalid tenant id');
	if (
		STORAGE_DRIVER === 's3' &&
		S3_ENDPOINT &&
		S3_BUCKET &&
		S3_ACCESS_KEY_ID &&
		S3_SECRET_ACCESS_KEY
	) {
		return prefixed(
			s3Storage({
				endpoint: S3_ENDPOINT,
				bucket: S3_BUCKET,
				region: S3_REGION,
				accessKeyId: S3_ACCESS_KEY_ID,
				secretAccessKey: S3_SECRET_ACCESS_KEY
			}),
			`tenants/${tenant.id}/`
		);
	}
	return localStorage(path.join(path.resolve(UPLOAD_DIR ?? tenantRoot()), tenant.id));
}

/** Keep each client's files under their own prefix in a shared bucket. */
function prefixed(inner: Storage, prefix: string): Storage {
	return {
		driver: inner.driver,
		put: (key, data, type) => inner.put(prefix + key, data, type),
		get: (key) => inner.get(prefix + key),
		delete: (key) => inner.delete(prefix + key),
		list: inner.list
			? async (p = '') => (await inner.list!(prefix + p)).map((k) => k.slice(prefix.length))
			: undefined
	};
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
			await walk(path.join(root, 'uploads'));
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

/** Page cache (anonymous GETs). In-memory, bounded. Keys always start with the client id. */
const memoryCache = new Map<
	string,
	{ body: string; headers: [string, string][]; status: number; expires: number }
>();
const MAX_CACHE_ENTRIES = 500;

export async function cacheGet(
	_platform: App.Platform | undefined,
	key: string
): Promise<Response | null> {
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
