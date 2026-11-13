import { sql } from 'drizzle-orm';
import type { DB } from './db/index.js';
import { sha256Hex } from './crypto.js';

/**
 * Fixed-window rate limiter stored in the database (works on D1 and SQLite,
 * across Worker isolates). Returns whether the request is allowed.
 */
export async function rateLimit(
	db: DB,
	key: string,
	limit: number,
	windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const now = Date.now();
	const reset = now + windowSeconds * 1000;
	const hashed = await sha256Hex(key);
	const row = await db.get<{ count: number; reset_at: number }>(sql`
		INSERT INTO rate_limits (key, count, reset_at) VALUES (${hashed}, 1, ${reset})
		ON CONFLICT(key) DO UPDATE SET
			count = CASE WHEN rate_limits.reset_at <= ${now} THEN 1 ELSE rate_limits.count + 1 END,
			reset_at = CASE WHEN rate_limits.reset_at <= ${now} THEN ${reset} ELSE rate_limits.reset_at END
		RETURNING count, reset_at
	`);
	// Occasional cleanup of stale rows.
	if (Math.random() < 0.02) await db.run(sql`DELETE FROM rate_limits WHERE reset_at <= ${now}`);
	const count = row?.count ?? 1;
	return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: row?.reset_at ?? reset };
}

export function clientIp(request: Request, getClientAddress: () => string): string {
	const cf = request.headers.get('cf-connecting-ip');
	if (cf) return cf;
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}
