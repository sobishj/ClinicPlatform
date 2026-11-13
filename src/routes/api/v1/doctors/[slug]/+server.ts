import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { readJson } from '#lib/server/api/body.js';
import { getDoctor } from '#lib/server/queries.js';
import { doctorOut } from '#lib/server/api/serialize.js';
import { doctors } from '#lib/server/db/schema.js';
import { contentChanged } from '#lib/server/audit.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = apiHandler('read', async ({ locals, params, url }) => {
	const r = await getDoctor(locals.db, params.slug!);
	if (!r) throw new ApiError(404, 'not_found', 'Doctor not found.');
	return { data: { ...doctorOut(r.doctor, url.origin), services: r.services.map((s) => ({ id: s.id, slug: s.slug, name: s.name })), leave: r.leaves.map(({ startDate, endDate }) => ({ startDate, endDate })) } };
});

const patchSchema = z
	.object({
		active: z.boolean(),
		featured: z.boolean(),
		summary: z.string().trim().max(400),
		qualifications: z.string().trim().max(200),
		specialities: z.array(z.string().trim().min(1).max(80)).max(10),
		languages: z.array(z.string().trim().min(1).max(40)).max(12),
		experienceYears: z.number().int().min(0).max(70)
	})
	.partial()
	.strict();

export const PATCH: RequestHandler = apiHandler('content:write', async (event) => {
	const body = patchSchema.parse(await readJson(event));
	const row = await event.locals.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.slug, event.params.slug!)).get();
	if (!row) throw new ApiError(404, 'not_found', 'Doctor not found.');
	if (Object.keys(body).length) await event.locals.db.update(doctors).set(body).where(eq(doctors.id, row.id));
	await contentChanged(event, 'update', 'doctor', row.id, `API: ${Object.keys(body).join(', ')}`);
	await emitEvent(event, 'doctor.updated', { id: row.id, slug: event.params.slug, changed: Object.keys(body) });
	return { ok: true };
});
export const OPTIONS: RequestHandler = optionsHandler;
