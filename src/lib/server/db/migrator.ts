/**
 * Runtime migrator used for every database (platform and each client), on D1 and on SQLite
 * files. Migrations are the SQL files drizzle-kit writes (drizzle/ and drizzle-platform/).
 *
 * Applied migrations are recorded in `_migrations`. Databases created earlier by drizzle's
 * own migrator (`__drizzle_migrations`) or by `wrangler d1 migrations apply` (`d1_migrations`)
 * are recognised, so an existing single-clinic database can be imported as a client as-is.
 *
 * On D1 each migration is sent as one `exec()` call, which keeps provisioning a new client
 * inside the free plan's per-request query limit.
 */
import { sql } from 'drizzle-orm';
import { isD1 } from './index.js';

export interface Migration {
	name: string;
	sql: string;
}

type AnyDb = {
	run: (q: ReturnType<typeof sql>) => unknown;
	all: <T>(q: ReturnType<typeof sql>) => Promise<T[]> | T[];
	$client?: unknown;
};

/** Split a drizzle-kit migration file into single statements. */
export function splitStatements(source: string): string[] {
	return source
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);
}

async function tableExists(db: AnyDb, name: string): Promise<boolean> {
	const rows = await db.all<{ name: string }>(
		sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${name}`
	);
	return rows.length > 0;
}

/** Run several DDL/DML statements (no parameters) as efficiently as the driver allows. */
export async function execStatements(db: AnyDb, statements: string[]) {
	if (!statements.length) return;
	if (isD1(db as never)) {
		// D1 exec() takes one statement per line.
		const script = statements
			.map((s) => s.replace(/\s*\n\s*/g, ' ').replace(/;?\s*$/, ';'))
			.join('\n');
		await (db.$client as { exec: (q: string) => Promise<unknown> }).exec(script);
		return;
	}
	const client = db.$client as {
		exec: (q: string) => void;
		transaction: (fn: () => void) => () => void;
	};
	client.transaction(() => {
		for (const s of statements) client.exec(s);
	})();
}

export async function appliedMigrations(db: AnyDb, migrations: Migration[]): Promise<Set<string>> {
	await db.run(
		sql`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`
	);
	const done = new Set(
		(await db.all<{ name: string }>(sql`SELECT name FROM _migrations`)).map((r) => r.name)
	);
	if (done.size) return done;

	// Adopt databases migrated by drizzle's migrator or by wrangler.
	let legacy: string[] = [];
	if (await tableExists(db, '__drizzle_migrations')) {
		const n =
			(await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`))[0]?.n ?? 0;
		legacy = migrations.slice(0, Number(n)).map((m) => m.name);
	} else if (await tableExists(db, 'd1_migrations')) {
		const names = new Set(
			(await db.all<{ name: string }>(sql`SELECT name FROM d1_migrations`)).map((r) =>
				r.name.replace(/\.sql$/, '')
			)
		);
		legacy = migrations.filter((m) => names.has(m.name)).map((m) => m.name);
	}
	if (legacy.length) {
		const now = Date.now();
		await execStatements(
			db,
			legacy.map(
				(name) =>
					`INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES ('${name.replace(/'/g, "''")}', ${now})`
			)
		);
		legacy.forEach((n) => done.add(n));
	}
	return done;
}

/** Apply pending migrations in order. Returns the names that were applied. */
export async function migrate(db: AnyDb, migrations: Migration[]): Promise<string[]> {
	const done = await appliedMigrations(db, migrations);
	const applied: string[] = [];
	for (const m of migrations) {
		if (done.has(m.name)) continue;
		const stmts = splitStatements(m.sql);
		stmts.push(
			`INSERT INTO _migrations (name, applied_at) VALUES ('${m.name.replace(/'/g, "''")}', ${Date.now()})`
		);
		await execStatements(db, stmts);
		applied.push(m.name);
	}
	return applied;
}

/** Turn a { '/drizzle/0000_init.sql': '...' } map (Vite glob or fs) into a sorted list. */
export function toMigrations(files: Record<string, string>): Migration[] {
	return Object.entries(files)
		.map(([file, source]) => ({
			name: file
				.split('/')
				.pop()!
				.replace(/\.sql$/, ''),
			sql: source
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
