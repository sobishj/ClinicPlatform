import { asc, eq, sql } from 'drizzle-orm';
import { locations, appointments } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction } from '#lib/server/crud.js';
import { failMessage } from '#lib/server/forms.js';
import { can } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const rows = await event.locals.db
		.select({
			id: locations.id,
			name: locations.name,
			type: locations.type,
			city: locations.city,
			area: locations.area,
			active: locations.active,
			photos: locations.photos,
			hasMap: sql<number>`${locations.mapEmbedUrl} IS NOT NULL`
		})
		.from(locations)
		.orderBy(asc(locations.sortOrder), asc(locations.name));
	return { title: 'Locations', items: rows, canWrite: can(user, 'content:write') };
};

export const actions: Actions = {
	reorder: (e) => reorderAction(e, locations, 'location'),
	toggle: (e) => toggleAction(e, locations, 'location'),
	delete: async (e) => {
		const id = String((await e.request.clone().formData()).get('id') ?? '');
		const used = await e.locals.db.select({ n: sql<number>`COUNT(*)` }).from(appointments).where(eq(appointments.locationId, id)).get();
		if (used?.n) return failMessage(`This branch has ${used.n} appointment request(s). Hide it instead of deleting, so the history is kept.`);
		return deleteAction(e, locations, 'location', (r) => r.name);
	}
};
