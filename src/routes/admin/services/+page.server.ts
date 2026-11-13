import { asc } from 'drizzle-orm';
import { services } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction } from '#lib/server/crud.js';
import { can } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const items = await event.locals.db
		.select({ id: services.id, name: services.name, category: services.category, icon: services.icon, image: services.image, active: services.active, price: services.price })
		.from(services)
		.orderBy(asc(services.sortOrder), asc(services.name));
	return { title: 'Services', items, canWrite: can(user, 'content:write') };
};

export const actions: Actions = {
	reorder: (e) => reorderAction(e, services, 'service'),
	toggle: (e) => toggleAction(e, services, 'service'),
	delete: (e) => deleteAction(e, services, 'service', (r) => r.name)
};
