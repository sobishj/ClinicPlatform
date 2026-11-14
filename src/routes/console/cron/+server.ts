import { error, json } from '@sveltejs/kit';
import { lt } from 'drizzle-orm';
import { CRON_SECRET } from '$app/env/private';
import { safeEqual } from '#lib/server/crypto.js';
import { processDueDeliveries, pruneDeliveries } from '#lib/server/integrations/webhooks.js';
import { sessions, rateLimits } from '#lib/server/db/schema.js';
import {
	tenants,
	platformSessions,
	ssoTokens,
	rateLimits as platformRateLimits
} from '#lib/server/platform-db/schema.js';
import { getTenantDb } from '#lib/server/platform.js';
import type { RequestHandler } from './$types';

/**
 * Housekeeping for every client: webhook retries and cleanup. Call every ~10 minutes on the
 * console host with `Authorization: Bearer $CRON_SECRET`. One client failing doesn't stop the rest.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	if (!CRON_SECRET || !safeEqual(token, CRON_SECRET)) error(401, 'Unauthorized');
	const pdb = locals.platformDb;
	const now = Date.now();
	const report: Record<string, { retried?: number; error?: string }> = {};
	for (const t of await pdb.select({ slug: tenants.slug, dbRef: tenants.dbRef }).from(tenants)) {
		try {
			const db = await getTenantDb(platform, t.dbRef);
			const retried = await processDueDeliveries(db, 50);
			await pruneDeliveries(db);
			await db.delete(sessions).where(lt(sessions.expiresAt, now));
			await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));
			report[t.slug] = { retried };
		} catch (err) {
			console.error(`[cron] ${t.slug}`, err);
			report[t.slug] = { error: 'failed' };
		}
	}
	await pdb.delete(platformSessions).where(lt(platformSessions.expiresAt, now));
	await pdb.delete(ssoTokens).where(lt(ssoTokens.expiresAt, now - 3600_000));
	await pdb.delete(platformRateLimits).where(lt(platformRateLimits.resetAt, now));
	return json({ ok: true, clients: report });
};
