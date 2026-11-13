import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import { listLocations } from '#lib/server/queries.js';
import { locationOut } from '#lib/server/api/serialize.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals, url }) => ({
	data: (await listLocations(locals.db)).map((l) => locationOut(l, url.origin))
}));
export const OPTIONS: RequestHandler = optionsHandler;
