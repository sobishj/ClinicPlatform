import { error, json } from '@sveltejs/kit';
import { lt } from 'drizzle-orm';
import { CRON_SECRET } from '$app/env/private';
import { safeEqual } from '#lib/server/crypto.js';
import { processDueDeliveries, pruneDeliveries } from '#lib/server/integrations/webhooks.js';
import { sessions, rateLimits } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

/**
 * Housekeeping: webhook retries and cleanup. Call every ~10 minutes with
 * `Authorization: Bearer $CRON_SECRET` (Cloudflare cron worker, systemd timer, cron-job.org…).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	if (!CRON_SECRET || !safeEqual(token, CRON_SECRET)) error(401, 'Unauthorized');
	const retried = await processDueDeliveries(locals.db, 50);
	await pruneDeliveries(locals.db);
	await locals.db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
	await locals.db.delete(rateLimits).where(lt(rateLimits.resetAt, Date.now()));
	return json({ ok: true, retried });
};
