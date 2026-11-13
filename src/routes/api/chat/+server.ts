import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import type { RequestHandler } from './$types';

const body = z.object({
	message: z.string().trim().min(1).max(1000),
	history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(2000) })).max(12).default([]),
	page: z.string().max(300).optional()
});

/**
 * Proxy to the clinic's own chatbot service. Keeps the chatbot API key on the server and
 * gives the bot the site context it needs (API base, booking deep links).
 */
export const POST: RequestHandler = async ({ request, locals, url, getClientAddress }) => {
	const s = locals.settings;
	if (!s.modules.chatbot || s.chatbot.provider !== 'endpoint' || !s.chatbot.endpointUrl) error(404, 'Chat is not enabled');
	const limit = await rateLimit(locals.db, `chat:${clientIp(request, getClientAddress)}`, 40, 600);
	if (!limit.allowed) return json({ reply: 'You have sent a lot of messages. Please call us if you need help quickly.', links: [] }, { status: 429 });
	const parsed = body.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, 'Invalid message');

	try {
		const res = await fetch(s.chatbot.endpointUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...(s.chatbot.apiKey ? { authorization: `Bearer ${s.chatbot.apiKey}` } : {}) },
			body: JSON.stringify({
				...parsed.data,
				site: {
					name: s.clinic.name,
					origin: url.origin,
					apiBase: `${url.origin}/api/v1`,
					bookingUrl: `${url.origin}/book`,
					bookingDeepLink: `${url.origin}/book?location={locationSlug}&doctor={doctorSlug}&service={serviceSlug}`,
					phones: s.clinic.phones,
					timeZone: s.clinic.timeZone
				}
			}),
			signal: AbortSignal.timeout(20_000)
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as { reply?: unknown; links?: unknown };
		const reply = typeof data.reply === 'string' ? data.reply.slice(0, 4000) : '';
		// Only allow same-site or https links, rendered as plain anchors by the widget.
		const links = Array.isArray(data.links)
			? data.links
					.filter((l): l is { label: string; href: string } => !!l && typeof l.label === 'string' && typeof l.href === 'string')
					.filter((l) => l.href.startsWith('/') || l.href.startsWith('https://') || l.href.startsWith('tel:'))
					.slice(0, 5)
					.map((l) => ({ label: l.label.slice(0, 80), href: l.href.slice(0, 500) }))
			: [];
		return json({ reply: reply || 'Sorry, I did not catch that.', links });
	} catch (err) {
		console.error('[chat]', err);
		return json({ reply: `Sorry, the assistant is unavailable right now. Please call ${s.clinic.phones[0] ?? 'us'} or use the booking form.`, links: [{ label: s.labels.bookCta, href: '/book' }] }, { status: 502 });
	}
};
