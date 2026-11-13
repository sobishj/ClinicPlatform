import { publicSettings } from '#lib/server/settings.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { site: publicSettings(locals.settings) };
};
