import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import { listDoctors } from '#lib/server/queries.js';
import { doctorOut } from '#lib/server/api/serialize.js';
import type { RequestHandler } from './$types';

/** ?location=<slug> filters to doctors working at that branch. */
export const GET: RequestHandler = apiHandler('read', async ({ locals, url }) => {
	const location = url.searchParams.get('location');
	const all = await listDoctors(locals.db);
	return { data: all.filter((d) => !location || d.branches.some((b) => b.slug === location)).map((d) => doctorOut(d, url.origin)) };
});
export const OPTIONS: RequestHandler = optionsHandler;
