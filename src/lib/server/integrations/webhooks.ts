import { and, asc, eq, lte, lt } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { webhooks, webhookDeliveries } from '../db/schema.js';
import { hmacSha256Hex } from '../crypto.js';

/** Retry delays after each failed attempt (then marked failed). */
export const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 12 * 3600_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

/**
 * Signature header: `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<body>")>`.
 * Receivers recompute the HMAC and reject timestamps older than ~5 minutes.
 */
export async function signPayload(secret: string, body: string, timestamp: number) {
	return `t=${timestamp},v1=${await hmacSha256Hex(secret, `${timestamp}.${body}`)}`;
}

export async function verifySignature(secret: string, body: string, header: string, toleranceSec = 300, now = Date.now()) {
	const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
	const t = Number(parts.t);
	if (!t || Math.abs(now / 1000 - t) > toleranceSec) return false;
	return parts.v1 === (await hmacSha256Hex(secret, `${t}.${body}`));
}

/** Queue one delivery per subscribed, active webhook. Returns the delivery ids. */
export async function enqueueEvent(db: DB, event: string, data: Record<string, unknown>): Promise<string[]> {
	const hooks = (await db.select().from(webhooks).where(eq(webhooks.active, true))).filter((h) => h.events.includes(event) || h.events.includes('*'));
	const ids: string[] = [];
	for (const h of hooks) {
		const id = crypto.randomUUID();
		const payload = JSON.stringify({ id, event, createdAt: new Date().toISOString(), data });
		await db.insert(webhookDeliveries).values({ id, webhookId: h.id, event, payload, status: 'pending', nextAttemptAt: Date.now() });
		ids.push(id);
	}
	return ids;
}

/** Attempt one delivery now. */
export async function attemptDelivery(db: DB, deliveryId: string): Promise<boolean> {
	const row = await db
		.select({ d: webhookDeliveries, url: webhooks.url, secret: webhooks.secret, active: webhooks.active })
		.from(webhookDeliveries)
		.innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
		.where(eq(webhookDeliveries.id, deliveryId))
		.get();
	if (!row || row.d.status === 'success') return true;
	const ts = Math.floor(Date.now() / 1000);
	let status: number | null = null;
	let error: string | null = null;
	try {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 10_000);
		const res = await fetch(row.url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'user-agent': 'ClinicSite-Webhooks/1.0',
				'x-webhook-id': row.d.id,
				'x-webhook-event': row.d.event,
				'x-webhook-timestamp': String(ts),
				'x-webhook-signature': await signPayload(row.secret, row.d.payload, ts)
			},
			body: row.d.payload,
			signal: ctrl.signal,
			redirect: 'manual'
		});
		clearTimeout(timer);
		status = res.status;
		if (!res.ok) error = `HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`;
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
	}
	const attempts = row.d.attempts + 1;
	const ok = !error;
	await db
		.update(webhookDeliveries)
		.set({
			attempts,
			responseStatus: status,
			lastError: error,
			status: ok ? 'success' : attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
			nextAttemptAt: ok || attempts >= MAX_ATTEMPTS ? null : Date.now() + BACKOFF_MS[attempts - 1]
		})
		.where(eq(webhookDeliveries.id, deliveryId));
	return ok;
}

/** Retry due deliveries (called by the cron endpoint and opportunistically). */
export async function processDueDeliveries(db: DB, limit = 20): Promise<number> {
	const due = await db
		.select({ id: webhookDeliveries.id })
		.from(webhookDeliveries)
		.where(and(eq(webhookDeliveries.status, 'pending'), lte(webhookDeliveries.nextAttemptAt, Date.now())))
		.orderBy(asc(webhookDeliveries.nextAttemptAt))
		.limit(limit);
	for (const d of due) await attemptDelivery(db, d.id);
	return due.length;
}

/** Keep the delivery log small (free-tier friendly). */
export async function pruneDeliveries(db: DB, olderThanDays = 30) {
	await db.delete(webhookDeliveries).where(lt(webhookDeliveries.createdAt, Date.now() - olderThanDays * 86400_000));
}
