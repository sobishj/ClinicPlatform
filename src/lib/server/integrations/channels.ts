/**
 * Notification channels beyond email. Each is optional and configured under
 * Admin → Integrations. Add a channel by implementing NotificationChannel and
 * appending it to channelsFor().
 */
import type { Settings } from '../../settings/schema.js';
import type { AppointmentDetails } from '../booking.js';
import { phoneDigits } from '../../format.js';

export interface ChannelMessage {
	/** Patient phone in international digits (e.g. 919876543210). */
	to: string;
	text: string;
	/** Template variables for template-based channels (WhatsApp). */
	params: string[];
}

export interface NotificationChannel {
	readonly id: string;
	send(msg: ChannelMessage): Promise<void>;
}

/** WhatsApp Business Cloud API (Meta). Business-initiated messages must use an approved template. */
export function whatsappCloudChannel(cfg: Settings['integrations']['whatsappCloud']): NotificationChannel | null {
	if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken || !cfg.templateName) return null;
	return {
		id: 'whatsapp-cloud',
		async send(msg) {
			const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(cfg.phoneNumberId)}/messages`, {
				method: 'POST',
				headers: { authorization: `Bearer ${cfg.accessToken}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					messaging_product: 'whatsapp',
					to: msg.to,
					type: 'template',
					template: {
						name: cfg.templateName,
						language: { code: cfg.templateLanguage || 'en' },
						components: [{ type: 'body', parameters: msg.params.map((text) => ({ type: 'text', text })) }]
					}
				}),
				signal: AbortSignal.timeout(10_000)
			});
			if (!res.ok) throw new Error(`WhatsApp Cloud API: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
		}
	};
}

/** SMS through any gateway that accepts a JSON webhook ({ to, text }) with a bearer token. */
export function smsWebhookChannel(cfg: Settings['integrations']['sms']): NotificationChannel | null {
	if (!cfg.enabled || cfg.provider !== 'webhook' || !/^https:\/\//.test(cfg.webhookUrl)) return null;
	return {
		id: 'sms-webhook',
		async send(msg) {
			const res = await fetch(cfg.webhookUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...(cfg.authToken ? { authorization: `Bearer ${cfg.authToken}` } : {}) },
				body: JSON.stringify({ to: `+${msg.to}`, text: msg.text }),
				signal: AbortSignal.timeout(10_000)
			});
			if (!res.ok) throw new Error(`SMS webhook: HTTP ${res.status}`);
		}
	};
}

export function channelsFor(s: Settings): NotificationChannel[] {
	return [whatsappCloudChannel(s.integrations.whatsappCloud), smsWebhookChannel(s.integrations.sms)].filter((c): c is NotificationChannel => !!c);
}

/** Patient-facing message for a new or updated appointment. */
export async function sendChannelNotifications(s: Settings, d: AppointmentDetails, kind: 'created' | 'status', when: string): Promise<void> {
	const channels = channelsFor(s);
	if (!channels.length) return;
	const to = phoneDigits(d.a.phone);
	const text =
		kind === 'created'
			? `${s.clinic.name}: we received your appointment request ${d.a.reference} for ${d.locationName}, ${when}. We will call you to confirm.`
			: `${s.clinic.name}: your appointment ${d.a.reference} at ${d.locationName} (${when}) is now ${d.a.status.replace('_', ' ')}.`;
	const params = [d.a.patientName, d.a.reference, d.locationName, when];
	const results = await Promise.allSettled(channels.map((c) => c.send({ to, text, params })));
	for (const r of results) if (r.status === 'rejected') console.error('[channels]', r.reason);
}
