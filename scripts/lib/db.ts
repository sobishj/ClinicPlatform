import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import * as schema from '../../src/lib/server/db/schema.js';
import * as platformSchema from '../../src/lib/server/platform-db/schema.js';
import { splitStatements, toMigrations, type Migration } from '../../src/lib/server/db/migrator.js';
import type { DB } from '../../src/lib/server/db/index.js';
import type { PlatformDB } from '../../src/lib/server/platform-db/index.js';

export function parseArgs(argv = process.argv.slice(2)): Record<string, string | true> {
	const out: Record<string, string | true> = {};
	for (const arg of argv) {
		const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
		if (m) out[m[1]] = m[2] ?? true;
	}
	return out;
}

/** Same locations the Node server uses (see src/lib/server/target/node.ts). */
export const PATHS = {
	platformDb: () => path.resolve(process.env.PLATFORM_DATABASE_PATH ?? './data/platform.db'),
	tenantRoot: () => path.resolve(process.env.TENANT_DATA_DIR ?? './data/tenants'),
	tenantDb: (dbRef: string) => path.join(PATHS.tenantRoot(), dbRef, 'site.db'),
	tenantFiles: (tenantId: string) =>
		path.join(path.resolve(process.env.UPLOAD_DIR ?? PATHS.tenantRoot()), tenantId)
};

function loadMigrations(dir: string): Migration[] {
	const full = path.resolve(dir);
	const files: Record<string, string> = {};
	for (const f of readdirSync(full).filter((f) => f.endsWith('.sql')))
		files[f] = readFileSync(path.join(full, f), 'utf8');
	return toMigrations(files);
}
export const TENANT_MIGRATIONS = () => loadMigrations('drizzle');
export const PLATFORM_MIGRATIONS = () => loadMigrations('drizzle-platform');

/** Synchronous twin of src/lib/server/db/migrator.ts `migrate()` (same `_migrations` table). */
export function migrateSync(sqlite: Database.Database, migrations: Migration[]): string[] {
	sqlite.exec(
		'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)'
	);
	const done = new Set(
		(sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name)
	);
	const has = (t: string) =>
		!!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
	const mark = sqlite.prepare('INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)');
	if (!done.size) {
		let legacy: string[] = [];
		if (has('__drizzle_migrations')) {
			const n = (
				sqlite.prepare('SELECT COUNT(*) AS n FROM __drizzle_migrations').get() as { n: number }
			).n;
			legacy = migrations.slice(0, n).map((m) => m.name);
		} else if (has('d1_migrations')) {
			const names = new Set(
				(sqlite.prepare('SELECT name FROM d1_migrations').all() as { name: string }[]).map((r) =>
					r.name.replace(/\.sql$/, '')
				)
			);
			legacy = migrations.filter((m) => names.has(m.name)).map((m) => m.name);
		}
		for (const name of legacy) {
			mark.run(name, Date.now());
			done.add(name);
		}
	}
	const applied: string[] = [];
	for (const m of migrations) {
		if (done.has(m.name)) continue;
		sqlite.transaction(() => {
			for (const stmt of splitStatements(m.sql)) sqlite.exec(stmt);
			mark.run(m.name, Date.now());
		})();
		applied.push(m.name);
	}
	return applied;
}

function openSqlite(file: string) {
	if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	return sqlite;
}

/** Open (and migrate) a client database file. */
export function openDb(file: string) {
	const sqlite = openSqlite(file);
	migrateSync(sqlite, TENANT_MIGRATIONS());
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { sqlite, db };
}

/** Open (and migrate) the platform database file. */
export function openPlatformDb(file = PATHS.platformDb()) {
	const sqlite = openSqlite(file);
	migrateSync(sqlite, PLATFORM_MIGRATIONS());
	const db = drizzle(sqlite, { schema: platformSchema }) as unknown as PlatformDB;
	return { sqlite, db };
}

/** Template manifests from /templates/<category>/<name>/manifest.json (scripts can't use Vite globs). */
export function readTemplate(
	key: string
): { key: string; name: string; sampleProfile: string } | null {
	if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(key)) return null;
	const file = path.resolve('templates', key, 'manifest.json');
	if (!existsSync(file)) return null;
	return JSON.parse(readFileSync(file, 'utf8'));
}

/** Tables in dependency order (parents first). */
export const TABLE_ORDER = [
	'settings',
	'media',
	'media_chunks',
	'locations',
	'location_closures',
	'users',
	'user_locations',
	'doctors',
	'doctor_locations',
	'doctor_leaves',
	'services',
	'service_locations',
	'service_doctors',
	'certifications',
	'slides',
	'blocks',
	'pages',
	'appointments',
	'appointment_notes',
	'messages',
	'api_keys',
	'webhooks',
	'webhook_deliveries',
	'audit_log'
];

function sqlValue(v: unknown): string {
	if (v === null || v === undefined) return 'NULL';
	if (typeof v === 'number' || typeof v === 'bigint') return String(v);
	if (typeof v === 'boolean') return v ? '1' : '0';
	if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`;
	return `'${String(v).replace(/'/g, "''")}'`;
}

/** Dump rows as INSERT statements (D1-compatible: no BEGIN/COMMIT). */
export function dumpTables(sqlite: Database.Database, tables = TABLE_ORDER): string {
	const lines: string[] = [];
	for (const table of tables) {
		const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
		for (const row of rows) {
			const cols = Object.keys(row);
			lines.push(
				`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols
					.map((c) => sqlValue(row[c]))
					.join(', ')});`
			);
		}
	}
	return lines.join('\n') + '\n';
}

export function deleteStatements(tables: string[]): string {
	return (
		[...tables]
			.reverse()
			.map((t) => `DELETE FROM "${t}";`)
			.join('\n') + '\n'
	);
}
