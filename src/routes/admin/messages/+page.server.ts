import { and, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { messages, locations } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { failMessage } from '#lib/server/forms.js';
import { locationScope } from '#lib/permissions.js';
import type { SessionUser } from '#lib/types.js';
import type { Actions, PageServerLoad } from './$types';

function scopeWhere(user: SessionUser): SQL | undefined {
	const scope = locationScope(user);
	if (!scope) return undefined;
	return scope.length ? inArray(messages.locationId, scope) : sql`0`;
}

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'appointments:read');
	const archived = event.url.searchParams.get('archived') === '1';
	const rows = await event.locals.db
		.select({ m: messages, locationName: locations.name })
		.from(messages)
		.leftJoin(locations, eq(locations.id, messages.locationId))
		.where(and(scopeWhere(user), archived ? eq(messages.status, 'archived') : ne(messages.status, 'archived')))
		.orderBy(desc(messages.createdAt))
		.limit(200);
	return { title: 'Messages', rows, archived };
};

export const actions: Actions = {
	status: async (event) => {
		const user = requirePermission(event, 'appointments:write');
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '');
		if (!['new', 'read', 'archived'].includes(status)) return failMessage('Invalid status');
		const where = and(eq(messages.id, id), scopeWhere(user));
		const row = await event.locals.db.select({ id: messages.id }).from(messages).where(where).get();
		if (!row) return failMessage('Not found', 404);
		await event.locals.db.update(messages).set({ status }).where(eq(messages.id, id));
		return { ok: true };
	}
};
