import { asc } from 'drizzle-orm';
import { doctors, doctorLocations, locations } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction } from '#lib/server/crud.js';
import { can } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const db = event.locals.db;
	const [rows, links, locs] = await Promise.all([
		db
			.select({
				id: doctors.id,
				title: doctors.title,
				name: doctors.name,
				qualifications: doctors.qualifications,
				photo: doctors.photo,
				active: doctors.active,
				featured: doctors.featured
			})
			.from(doctors)
			.orderBy(asc(doctors.sortOrder), asc(doctors.name)),
		db.select({ doctorId: doctorLocations.doctorId, locationId: doctorLocations.locationId }).from(doctorLocations),
		db.select({ id: locations.id, name: locations.name }).from(locations)
	]);
	const locName = new Map(locs.map((l) => [l.id, l.name]));
	return {
		title: 'Doctors',
		items: rows.map((r) => ({
			...r,
			branches: links.filter((l) => l.doctorId === r.id).map((l) => locName.get(l.locationId) ?? '')
		})),
		canWrite: can(user, 'content:write')
	};
};

export const actions: Actions = {
	reorder: (e) => reorderAction(e, doctors, 'doctor'),
	toggle: (e) => toggleAction(e, doctors, 'doctor'),
	delete: (e) => deleteAction(e, doctors, 'doctor', (r) => r.name)
};
