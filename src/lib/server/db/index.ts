import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { SQL } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

/**
 * The one database type feature code sees. D1 (async) and better-sqlite3 (sync, but awaitable)
 * expose the same query-builder API; we always `await` queries so either works.
 */
export type DB = DrizzleD1Database<typeof schema>;
export { schema };

/**
 * Run several write statements atomically.
 * D1 has no interactive transactions, so we use `batch()` there; on better-sqlite3
 * we wrap the statements in BEGIN/COMMIT on the single connection.
 */
export async function runBatch(
	db: DB,
	statements: Array<{ execute?: unknown } & PromiseLike<unknown>>
) {
	if (statements.length === 0) return;
	const anyDb = db as unknown as { batch?: (q: unknown[]) => Promise<unknown>; $client?: unknown };
	if (isD1(db) && typeof anyDb.batch === 'function') {
		await anyDb.batch(statements as unknown[]);
		return;
	}
	await db.run(sql`BEGIN`);
	try {
		for (const s of statements) await s;
		await db.run(sql`COMMIT`);
	} catch (err) {
		await db.run(sql`ROLLBACK`);
		throw err;
	}
}

export function isD1(db: DB): boolean {
	const client = (
		db as unknown as { $client?: { prepare?: unknown; exec?: unknown; pragma?: unknown } }
	).$client;
	// better-sqlite3 clients have `pragma`; D1 bindings do not.
	return !!client && typeof client.pragma !== 'function';
}

export type { SQL };
