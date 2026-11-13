import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['clinic', 'labels', 'modules', 'locationTypes'] as const;

export const load: PageServerLoad = async (event) => ({ title: 'Type, labels & modules', ...loadGroups(event, [...KEYS]) });

export const actions: Actions = {
	save: (event) => saveGroups(event, [...KEYS])
};
