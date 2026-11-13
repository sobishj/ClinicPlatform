import { error } from '@sveltejs/kit';
import { getPage } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireModule(locals.settings, 'blog');
	const post = await getPage(locals.db, 'post', params.slug);
	if (!post || (post.publishedAt && post.publishedAt > Date.now())) error(404, { message: 'Page not found' });
	return { post };
};
