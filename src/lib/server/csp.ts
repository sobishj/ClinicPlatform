import type { Settings } from '../settings/schema.js';
import { parseEmbedCode } from '../chatbot/embed.js';

/**
 * Extend Kit's nonce-based CSP with sources that depend on clinic settings:
 * Google Analytics (if configured) and the chatbot embed's origins/inline-script hashes.
 * Nothing is added on /admin.
 */
export function buildCsp(base: string, settings: Settings, isAdmin: boolean): string {
	const directives = new Map<string, string[]>();
	for (const part of base.split(';')) {
		const [name, ...values] = part.trim().split(/\s+/);
		if (name) directives.set(name, values);
	}
	const add = (name: string, ...values: string[]) => {
		const list = directives.get(name) ?? [];
		for (const v of values) if (!list.includes(v)) list.push(v);
		directives.set(name, list);
	};

	if (!isAdmin) {
		if (settings.analytics.ga4Id) {
			add('script-src', 'https://www.googletagmanager.com');
			add(
				'connect-src',
				'https://www.googletagmanager.com',
				'https://*.google-analytics.com',
				'https://*.analytics.google.com'
			);
		}
		if (settings.modules.chatbot && settings.chatbot.provider === 'embed' && settings.chatbot.embedCode) {
			const parsed = parseEmbedCode(settings.chatbot.embedCode);
			if (parsed.origins.length) {
				add('script-src', ...parsed.origins);
				add('connect-src', ...parsed.origins, ...parsed.origins.map((o) => o.replace(/^https:/, 'wss:')));
				add('frame-src', ...parsed.origins);
				add('style-src', ...parsed.origins);
				add('font-src', ...parsed.origins);
			}
			if (parsed.inlineHashes.length) add('script-src', ...parsed.inlineHashes.map((h) => `'${h}'`));
		}
	}

	return [...directives.entries()].map(([k, v]) => [k, ...v].join(' ')).join('; ');
}
