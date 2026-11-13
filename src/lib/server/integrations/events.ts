import type { RequestEvent } from '@sveltejs/kit';
import { enqueueEvent, attemptDelivery } from './webhooks.js';
import { background } from '../platform.js';

export const WEBHOOK_EVENTS = [
	'appointment.created',
	'appointment.updated',
	'appointment.cancelled',
	'doctor.updated',
	'location.updated'
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Emit a domain event: queue a signed delivery for every subscribed webhook and try it
 * in the background (after the response). Failed deliveries are retried with backoff by processDueDeliveries().
 * Never throws — integrations must not break the main action.
 */
export async function emitEvent(event: Pick<RequestEvent, 'locals' | 'platform'>, name: WebhookEvent, data: Record<string, unknown>): Promise<void> {
	try {
		const db = event.locals.db;
		const ids = await enqueueEvent(db, name, data);
		if (ids.length) background(event.platform, Promise.allSettled(ids.map((id) => attemptDelivery(db, id))));
	} catch (err) {
		console.error('[webhooks]', err);
	}
}
