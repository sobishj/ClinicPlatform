import { listDoctors } from '#lib/server/queries.js';
import { requireModule } from '#lib/server/modules.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireModule(locals.settings, 'doctors');
	const doctors = await listDoctors(locals.db);
	const specialities = [...new Set(doctors.flatMap((d) => d.specialities))].sort();
	return { doctors, specialities };
};
