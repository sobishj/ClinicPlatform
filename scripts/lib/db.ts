import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from '../../src/lib/server/db/schema.js';

export function parseArgs(argv = process.argv.slice(2)): Record<string, string | true> {
	const out: Record<string, string | true> = {};
	for (const arg of argv) {
		const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
		if (m) out[m[1]] = m[2] ?? true;
	}
	return out;
}

/** Open (and migrate) a local SQLite database. Use ':memory:' for a scratch database. */
export function openDb(file: string) {
	if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: path.resolve('drizzle') });
	return { sqlite, db };
}

/** Tables in dependency order (parents first). */
export const TABLE_ORDER = [
	'settings',
	'media',
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
	return [...tables].reverse().map((t) => `DELETE FROM "${t}";`).join('\n') + '\n';
}
