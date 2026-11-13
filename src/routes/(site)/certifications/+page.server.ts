import { listCertifications } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'certifications');
	return { items: await listCertifications(locals.db) };
};
