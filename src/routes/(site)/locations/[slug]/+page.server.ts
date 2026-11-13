import { error } from '@sveltejs/kit';
import { getLocation } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireModule(locals.settings, 'locations');
	const result = await getLocation(locals.db, params.slug);
	if (!result) error(404, { message: 'Page not found' });
	return result;
};
