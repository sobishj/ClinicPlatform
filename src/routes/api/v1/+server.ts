import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler(null, async ({ url }) => ({
	name: 'Clinic website API',
	version: 'v1',
	docs: `${url.origin}/api/v1/openapi.json`,
	auth: 'Authorization: Bearer <API key> (create keys in Admin → Integrations & API)'
}));
export const OPTIONS: RequestHandler = optionsHandler;
