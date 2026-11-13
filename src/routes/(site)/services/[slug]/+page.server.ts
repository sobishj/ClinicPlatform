import { error } from '@sveltejs/kit';
import { getService } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireModule(locals.settings, 'services');
	const result = await getService(locals.db, params.slug);
	if (!result) error(404, 'Page not found');
	return result;
};
