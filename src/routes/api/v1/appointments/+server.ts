import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { readJson } from '#lib/server/api/body.js';
import { bookingSchema } from '#lib/schemas/booking.js';
import { createAppointment, appointmentDetails, appointmentPayload, BookingError } from '#lib/server/booking.js';
import { appointments, locations, doctors, services } from '#lib/server/db/schema.js';
import { audit } from '#lib/server/audit.js';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '#lib/types.js';
import type { RequestHandler } from './$types';

/** Accept ids or slugs for location/doctor/service so integrations can use either. */
async function resolveId(db: App.Locals['db'], table: typeof locations | typeof doctors | typeof services, value: string | undefined) {
	if (!value) return '';
	const byId = await db.select({ id: table.id }).from(table).where(eq(table.id, value)).get();
	if (byId) return byId.id;
	const bySlug = await db.select({ id: table.id }).from(table).where(eq(table.slug, value)).get();
	return bySlug?.id ?? value;
}

const createBody = z.object({
	location: z.string().min(1),
	doctor: z.string().optional(),
	service: z.string().optional(),
	date: z.string(),
	timeWindow: z.enum(['morning', 'afternoon', 'evening']).optional(),
	/** ISO-8601 start of a live slot (from /availability) */
	slotStart: z.string().datetime({ offset: true }).optional(),
	patient: z.object({ name: z.string(), phone: z.string(), email: z.string().optional() }),
	notes: z.string().optional(),
	/** The patient agreed to their data being processed (DPDP). Required. */
	consent: z.literal(true, { error: 'consent must be true: the patient must agree to data processing' }),
	source: z.enum(['api', 'chatbot']).default('api')
});

export const POST: RequestHandler = apiHandler('appointments:create', async (event) => {
	const s = event.locals.settings;
	const b = createBody.parse(await readJson(event));
	const db = event.locals.db;
	const input = bookingSchema({ phonePattern: s.booking.phonePattern, phoneHint: s.booking.phoneHint, requireEmail: s.booking.requireEmail }).parse({
		locationId: await resolveId(db, locations, b.location),
		doctorId: await resolveId(db, doctors, b.doctor),
		serviceId: await resolveId(db, services, b.service),
		date: b.date,
		timeWindow: b.slotStart ? 'slot' : (b.timeWindow ?? ''),
		slot: b.slotStart ? String(Date.parse(b.slotStart)) : '',
		name: b.patient.name,
		phone: b.patient.phone,
		email: b.patient.email ?? '',
		notes: b.notes ?? '',
		consent: 'true'
	});
	try {
		const row = await createAppointment(event, input, { source: b.source });
		await audit(event, 'create', 'appointment', row.id, `${row.reference} via API`);
		const d = await appointmentDetails(db, row.id);
		return new Response(JSON.stringify({ data: d ? appointmentPayload(d) : { id: row.id, reference: row.reference } }), {
			status: 201,
			headers: { 'content-type': 'application/json', location: `/api/v1/appointments/${row.id}` }
		});
	} catch (err) {
		if (err instanceof BookingError) throw new ApiError(err.status === 409 ? 409 : 422, err.status === 409 ? 'slot_taken' : 'validation_failed', err.message, { [err.field]: err.message });
		throw err;
	}
});

export const GET: RequestHandler = apiHandler('appointments:read', async ({ locals, url }) => {
	const q = url.searchParams;
	const conds: SQL[] = [];
	const status = q.get('status');
	if (status && (APPOINTMENT_STATUSES as string[]).includes(status)) conds.push(eq(appointments.status, status as AppointmentStatus));
	if (q.get('location')) conds.push(eq(appointments.locationId, await resolveId(locals.db, locations, q.get('location')!)));
	if (q.get('from')) conds.push(gte(appointments.preferredDate, q.get('from')!));
	if (q.get('to')) conds.push(lte(appointments.preferredDate, q.get('to')!));
	const since = Date.parse(q.get('updatedSince') ?? '');
	if (!Number.isNaN(since)) conds.push(gte(appointments.updatedAt, since));
	const limit = Math.min(200, Math.max(1, Number(q.get('limit')) || 50));
	const page = Math.max(1, Number(q.get('page')) || 1);
	const ids = await locals.db
		.select({ id: appointments.id })
		.from(appointments)
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(appointments.updatedAt))
		.limit(limit + 1)
		.offset((page - 1) * limit);
	const data = [];
	for (const { id } of ids.slice(0, limit)) {
		const d = await appointmentDetails(locals.db, id);
		if (d) data.push(appointmentPayload(d));
	}
	return { data, page, hasMore: ids.length > limit };
});
export const OPTIONS: RequestHandler = optionsHandler;
