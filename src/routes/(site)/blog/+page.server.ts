import { listPosts } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'blog');
	return { posts: await listPosts(locals.db) };
};
