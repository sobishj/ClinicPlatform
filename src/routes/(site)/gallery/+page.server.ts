import { listBlocks } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { ImageRef } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'gallery');
	return { items: await listBlocks<{ image: ImageRef; caption: string; category: string }>(locals.db, 'gallery') };
};
