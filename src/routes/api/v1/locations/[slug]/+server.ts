import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { readJson } from '#lib/server/api/body.js';
import { getLocation } from '#lib/server/queries.js';
import { locationOut } from '#lib/server/api/serialize.js';
import { locations } from '#lib/server/db/schema.js';
import { weeklyHoursSchema } from '#lib/server/crud.js';
import { contentChanged } from '#lib/server/audit.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals, params, url }) => {
	const r = await getLocation(locals.db, params.slug!);
	if (!r) throw new ApiError(404, 'not_found', 'Location not found.');
	return {
		data: {
			...locationOut(r.location, url.origin),
			doctors: r.doctors.map((d) => ({ id: d.id, slug: d.slug, name: d.title ? `${d.title} ${d.name}` : d.name, schedule: d.schedule, bookable: d.bookable })),
			services: r.services.map((s) => ({ id: s.id, slug: s.slug, name: s.name }))
		}
	};
});

const patchSchema = z
	.object({
		active: z.boolean(),
		summary: z.string().trim().max(300),
		phones: z.array(z.string().trim().min(5).max(40)).max(5),
		whatsapp: z.string().trim().max(40).nullable(),
		email: z.string().trim().email().nullable(),
		hours: weeklyHoursSchema
	})
	.partial()
	.strict();

export const PATCH: RequestHandler = apiHandler('content:write', async (event) => {
	const body = patchSchema.parse(await readJson(event));
	const row = await event.locals.db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.slug, event.params.slug!)).get();
	if (!row) throw new ApiError(404, 'not_found', 'Location not found.');
	if (Object.keys(body).length) await event.locals.db.update(locations).set(body).where(eq(locations.id, row.id));
	await contentChanged(event, 'update', 'location', row.id, `API: ${Object.keys(body).join(', ')}`);
	await emitEvent(event, 'location.updated', { id: row.id, slug: event.params.slug, changed: Object.keys(body) });
	return { ok: true };
});
export const OPTIONS: RequestHandler = optionsHandler;
