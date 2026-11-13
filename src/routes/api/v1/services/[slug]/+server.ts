import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { readJson } from '#lib/server/api/body.js';
import { getService } from '#lib/server/queries.js';
import { serviceOut } from '#lib/server/api/serialize.js';
import { services } from '#lib/server/db/schema.js';
import { contentChanged } from '#lib/server/audit.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals, params, url }) => {
	const r = await getService(locals.db, params.slug!);
	if (!r) throw new ApiError(404, 'not_found', 'Service not found.');
	return {
		data: {
			...serviceOut(r.service, url.origin),
			locations: r.locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name })),
			doctors: r.doctors.map((d) => ({ id: d.id, slug: d.slug, name: d.title ? `${d.title} ${d.name}` : d.name }))
		}
	};
});

const patchSchema = z
	.object({
		active: z.boolean(),
		summary: z.string().trim().max(400),
		durationMinutes: z.number().int().min(5).max(600).nullable(),
		price: z.number().int().min(0).nullable(),
		priceFrom: z.boolean()
	})
	.partial()
	.strict();

export const PATCH: RequestHandler = apiHandler('content:write', async (event) => {
	const body = patchSchema.parse(await readJson(event));
	const row = await event.locals.db.select({ id: services.id }).from(services).where(eq(services.slug, event.params.slug!)).get();
	if (!row) throw new ApiError(404, 'not_found', 'Service not found.');
	if (Object.keys(body).length) await event.locals.db.update(services).set(body).where(eq(services.id, row.id));
	await contentChanged(event, 'update', 'service', row.id, `API: ${Object.keys(body).join(', ')}`);
	return { ok: true };
});
export const OPTIONS: RequestHandler = optionsHandler;
