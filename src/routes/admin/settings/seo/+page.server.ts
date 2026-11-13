import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['seo', 'analytics', 'security'] as const;

export const load: PageServerLoad = async (event) => ({ title: 'SEO, analytics & spam', ...loadGroups(event, [...KEYS]) });

export const actions: Actions = {
	save: (event) => saveGroups(event, [...KEYS])
};
