import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { appointments, appointmentNotes, doctors, doctorLocations } from '#lib/server/db/schema.js';
import { requirePermission, requireLocationAccess } from '#lib/server/auth.js';
import { appointmentDetails, appointmentPayload } from '#lib/server/booking.js';
import { notifyAppointment } from '#lib/server/notifications.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import { getIntegrationProvider } from '#lib/server/integrations/registry.js';
import { background } from '#lib/server/platform.js';
import { parsePayload } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import { APPOINTMENT_STATUSES, STATUS_LABELS, type AppointmentStatus } from '#lib/types.js';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function loadOwned(event: RequestEvent | Parameters<PageServerLoad>[0], permission: 'appointments:read' | 'appointments:write') {
	const user = requirePermission(event, permission);
	const d = await appointmentDetails(event.locals.db, event.params.id);
	if (!d) error(404, { message: 'Appointment not found' });
	requireLocationAccess(user, d.a.locationId);
	return { user, d };
}

export const load: PageServerLoad = async (event) => {
	const { d } = await loadOwned(event, 'appointments:read');
	const db = event.locals.db;
	const [notes, docs] = await Promise.all([
		db.select().from(appointmentNotes).where(eq(appointmentNotes.appointmentId, d.a.id)).orderBy(asc(appointmentNotes.createdAt)),
		db
			.select({ id: doctors.id, title: doctors.title, name: doctors.name })
			.from(doctorLocations)
			.innerJoin(doctors, eq(doctors.id, doctorLocations.doctorId))
			.where(eq(doctorLocations.locationId, d.a.locationId))
	]);
	return { title: `${d.a.reference} · ${d.a.patientName}`, d, notes, doctors: docs, whatsappTemplate: event.locals.settings.notifications.whatsappTemplate };
};

const updateSchema = z.object({
	status: z.enum(APPOINTMENT_STATUSES as [AppointmentStatus, ...AppointmentStatus[]]),
	preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
	timeWindow: z.enum(['morning', 'afternoon', 'evening', 'slot']),
	doctorId: z.string().nullable().default(null),
	note: z.string().trim().max(2000).optional().default(''),
	notifyPatient: z.boolean().default(true)
});

export const actions: Actions = {
	update: async (event) => {
		const { user, d } = await loadOwned(event, 'appointments:write');
		const parsed = await parsePayload(event.request, updateSchema);
		if (!parsed.ok) return parsed.failure;
		const u = parsed.data;
		const db = event.locals.db;
		const changes: string[] = [];
		if (u.status !== d.a.status) changes.push(`Status: ${STATUS_LABELS[d.a.status]} → ${STATUS_LABELS[u.status]}`);
		const rescheduled = u.preferredDate !== d.a.preferredDate || u.timeWindow !== d.a.timeWindow;
		if (rescheduled) changes.push(`Date: ${d.a.preferredDate} ${d.a.timeWindow} → ${u.preferredDate} ${u.timeWindow}`);
		if ((u.doctorId || null) !== d.a.doctorId) changes.push('Doctor changed');
		if (u.timeWindow === 'slot' && !d.a.slotStart) return fail(400, { errors: { timeWindow: 'Choose morning, afternoon or evening' }, message: 'A live time slot can only be booked from the website.' });

		await db
			.update(appointments)
			.set({
				status: u.status,
				preferredDate: u.preferredDate,
				timeWindow: u.timeWindow,
				doctorId: u.doctorId || null,
				// A manually moved appointment no longer holds its original live slot.
				...(rescheduled && d.a.slotStart ? { slotStart: null, slotEnd: null } : {})
			})
			.where(eq(appointments.id, d.a.id));
		const noteText = [changes.join('; '), u.note].filter(Boolean).join('\n');
		if (noteText) await db.insert(appointmentNotes).values({ appointmentId: d.a.id, userId: user.id, userName: user.name, note: noteText });
		await audit(event, u.status !== d.a.status ? 'status' : 'update', 'appointment', d.a.id, `${d.a.reference}: ${changes.join('; ') || 'note added'}`);

		if (changes.length) {
			const fresh = await appointmentDetails(db, d.a.id);
			if (fresh) {
				const payload = appointmentPayload(fresh);
				const cancelled = u.status === 'cancelled' && d.a.status !== 'cancelled';
				background(
					event.platform,
					Promise.allSettled([
						emitEvent(event, cancelled ? 'appointment.cancelled' : 'appointment.updated', payload),
						getIntegrationProvider(event.locals.settings).then((p) => p.syncAppointment?.(payload, cancelled ? 'cancelled' : 'updated')),
						u.notifyPatient && ['confirmed', 'rescheduled', 'cancelled'].includes(u.status) && (u.status !== d.a.status || rescheduled)
							? notifyAppointment(event, fresh, 'status')
							: Promise.resolve()
					])
				);
			}
		}
		return { ok: true };
	},
	note: async (event) => {
		const { user, d } = await loadOwned(event, 'appointments:write');
		const parsed = await parsePayload(event.request, z.object({ note: z.string().trim().min(1, 'Write a note').max(2000) }));
		if (!parsed.ok) return parsed.failure;
		await event.locals.db.insert(appointmentNotes).values({ appointmentId: d.a.id, userId: user.id, userName: user.name, note: parsed.data.note });
		return { ok: true };
	}
};
