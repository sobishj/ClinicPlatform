import type { EmailProvider } from './types.js';

/** Resend HTTP API — works on Workers and Node. */
export function resendProvider(apiKey: string, from: string, defaultReplyTo?: string): EmailProvider {
	return {
		name: 'resend',
		async send(msg) {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					from,
					to: Array.isArray(msg.to) ? msg.to : [msg.to],
					subject: msg.subject,
					html: msg.html,
					text: msg.text,
					reply_to: msg.replyTo ?? defaultReplyTo
				})
			});
			if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
		}
	};
}
