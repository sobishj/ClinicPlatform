import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { readJson } from '#lib/server/api/body.js';
import { appointmentDetails, appointmentPayload } from '#lib/server/booking.js';
import { appointments, appointmentNotes } from '#lib/server/db/schema.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import { notifyAppointment } from '#lib/server/notifications.js';
import { background } from '#lib/server/platform.js';
import { audit } from '#lib/server/audit.js';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '#lib/types.js';
import type { RequestHandler } from './$types';

async function load(db: App.Locals['db'], idOrRef: string) {
	const row = await db.select({ id: appointments.id }).from(appointments).where(eq(idOrRef.includes('-') && idOrRef.length < 12 ? appointments.reference : appointments.id, idOrRef)).get();
	const d = row ? await appointmentDetails(db, row.id) : null;
	if (!d) throw new ApiError(404, 'not_found', 'Appointment not found.');
	return d;
}

export const GET: RequestHandler = apiHandler('appointments:read', async ({ locals, params }) => ({ data: appointmentPayload(await load(locals.db, params.id!)) }));

const patchSchema = z
	.object({
		status: z.enum(APPOINTMENT_STATUSES as [AppointmentStatus, ...AppointmentStatus[]]),
		preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		timeWindow: z.enum(['morning', 'afternoon', 'evening']),
		externalId: z.string().max(120).nullable(),
		note: z.string().trim().max(2000),
		notifyPatient: z.boolean()
	})
	.partial()
	.strict();

export const PATCH: RequestHandler = apiHandler('appointments:write', async (event) => {
	const db = event.locals.db;
	const d = await load(db, event.params.id!);
	const { note, notifyPatient, ...body } = patchSchema.parse(await readJson(event));
	const rescheduled = (body.preferredDate && body.preferredDate !== d.a.preferredDate) || (body.timeWindow && body.timeWindow !== d.a.timeWindow);
	if (Object.keys(body).length) {
		await db
			.update(appointments)
			.set({ ...body, ...(rescheduled ? { slotStart: null, slotEnd: null } : {}) })
			.where(eq(appointments.id, d.a.id));
	}
	const summary = [body.status && body.status !== d.a.status ? `Status → ${body.status}` : '', rescheduled ? 'Rescheduled' : '', note ?? ''].filter(Boolean).join('\n');
	if (summary) await db.insert(appointmentNotes).values({ appointmentId: d.a.id, userName: `API: ${event.locals.apiKey?.name}`, note: summary });
	await audit(event, 'update', 'appointment', d.a.id, `${d.a.reference} via API: ${Object.keys(body).join(', ')}`);
	const fresh = (await appointmentDetails(db, d.a.id))!;
	const cancelled = body.status === 'cancelled' && d.a.status !== 'cancelled';
	background(
		event.platform,
		Promise.allSettled([
			emitEvent(event, cancelled ? 'appointment.cancelled' : 'appointment.updated', appointmentPayload(fresh)),
			notifyPatient && fresh.a.email ? notifyAppointment(event, fresh, 'status') : Promise.resolve()
		])
	);
	return { data: appointmentPayload(fresh) };
});
export const OPTIONS: RequestHandler = optionsHandler;
