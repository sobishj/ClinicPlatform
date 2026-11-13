import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import { listServices } from '#lib/server/queries.js';
import { serviceOut } from '#lib/server/api/serialize.js';
import { serviceLocations } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals, url }) => {
	const [all, links] = await Promise.all([listServices(locals.db), locals.db.select().from(serviceLocations)]);
	return { data: all.map((s) => serviceOut(s, url.origin, { locationIds: links.filter((l) => l.serviceId === s.id).map((l) => l.locationId) })) };
});
export const OPTIONS: RequestHandler = optionsHandler;
