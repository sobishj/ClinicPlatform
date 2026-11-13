import { navData } from '#lib/server/queries.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { nav: await navData(locals.db) };
};
