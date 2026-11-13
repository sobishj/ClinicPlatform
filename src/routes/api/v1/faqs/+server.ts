import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import { listBlocks } from '#lib/server/queries.js';
import { toPlainText } from '#lib/server/sanitize.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals }) => {
	const faqs = await listBlocks<{ question: string; answer: string; category?: string }>(locals.db, 'faqs');
	return { data: faqs.map((f) => ({ question: f.question, answer: toPlainText(f.answer, 4000), answerHtml: f.answer, category: f.category || null })) };
});
export const OPTIONS: RequestHandler = optionsHandler;
