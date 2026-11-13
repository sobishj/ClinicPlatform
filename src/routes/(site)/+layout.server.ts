import { navData } from '#lib/server/queries.js';
import { parseEmbedCode } from '#lib/chatbot/embed.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const s = locals.settings;
	const chatScripts = s.modules.chatbot && s.chatbot.provider === 'embed' && s.chatbot.embedCode ? parseEmbedCode(s.chatbot.embedCode).scripts : [];
	return { nav: await navData(locals.db), chatScripts };
};
