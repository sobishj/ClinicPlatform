import { listServices, groupByCategory } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'services');
	return { groups: groupByCategory(await listServices(locals.db), locals.settings.labels.services) };
};
