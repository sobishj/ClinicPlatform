import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['homepage', 'banner', 'disclaimer'] as const;

export const load: PageServerLoad = async (event) => ({ title: 'Homepage', ...loadGroups(event, [...KEYS]) });

export const actions: Actions = {
	save: (event) => saveGroups(event, [...KEYS])
};
