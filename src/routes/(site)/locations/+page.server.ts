import { listLocations } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'locations');
	return { locations: await listLocations(locals.db) };
};
