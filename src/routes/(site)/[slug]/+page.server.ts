import { error } from '@sveltejs/kit';
import { getPage, listCertifications } from '#lib/server/queries.js';
import type { PageServerLoad } from './$types';

/** Custom pages created in admin, plus /about, /privacy and /terms. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const page = await getPage(locals.db, 'page', params.slug);
	if (!page) error(404, { message: 'Page not found' });
	const certifications = params.slug === 'about' && locals.settings.modules.certifications ? (await listCertifications(locals.db)).slice(0, 6) : [];
	return { page, certifications };
};
