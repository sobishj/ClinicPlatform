import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['booking'] as const;

export const load: PageServerLoad = async (event) => ({ title: 'Booking settings', ...loadGroups(event, [...KEYS]) });

export const actions: Actions = {
	save: (event) => saveGroups(event, [...KEYS])
};
