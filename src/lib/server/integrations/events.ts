import type { RequestEvent } from '@sveltejs/kit';

export const WEBHOOK_EVENTS = [
	'appointment.created',
	'appointment.updated',
	'appointment.cancelled',
	'doctor.updated',
	'location.updated'
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Emit a domain event to registered webhooks and the integration provider.
 * (Implemented in Phase 5 — until then this is a no-op so callers are already wired.)
 */
export async function emitEvent(
	_event: Pick<RequestEvent, 'locals' | 'platform'>,
	_name: WebhookEvent,
	_data: Record<string, unknown>
): Promise<void> {}
