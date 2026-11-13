import { fail } from '@sveltejs/kit';
import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import { parseEmbedCode } from '#lib/chatbot/embed.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['chatbot', 'modules'] as const;

export const load: PageServerLoad = async (event) => ({ title: 'Chatbot', apiBase: `${event.url.origin}/api/v1`, ...loadGroups(event, [...KEYS]) });

export const actions: Actions = {
	save: async (event) => {
		// Validate provider-specific fields before saving.
		const body = JSON.parse(String((await event.request.clone().formData()).get('payload') ?? '{}'));
		const c = body.chatbot ?? {};
		if (c.provider === 'embed') {
			const parsed = parseEmbedCode(String(c.embedCode ?? ''));
			if (!parsed.scripts.length) return fail(400, { errors: { 'chatbot.embedCode': parsed.errors[0] ?? 'Paste the widget code.' }, message: 'Check the embed code.' });
		}
		if (c.provider === 'endpoint' && !/^https:\/\//.test(String(c.endpointUrl ?? ''))) {
			return fail(400, { errors: { 'chatbot.endpointUrl': 'Enter an https:// URL' }, message: 'Check the endpoint URL.' });
		}
		return saveGroups(event, [...KEYS]);
	}
};
