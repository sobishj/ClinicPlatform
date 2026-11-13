import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { appointments } from '#lib/server/db/schema.js';
import { appointmentDetails } from '#lib/server/booking.js';
import type { RequestHandler } from './$types';

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** iCalendar file for a live-slot booking. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const ref = url.searchParams.get('ref') ?? '';
	const row = await locals.db.select({ id: appointments.id }).from(appointments).where(eq(appointments.reference, ref)).get();
	const d = row ? await appointmentDetails(locals.db, row.id) : null;
	if (!d?.a.slotStart || !d.a.slotEnd) error(404, 'Not found');
	const s = locals.settings;
	const ics = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:-//${escIcs(s.clinic.name)}//Appointments//EN`,
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${d.a.id}@${url.hostname}`,
		`DTSTAMP:${stamp(Date.now())}`,
		`DTSTART:${stamp(d.a.slotStart)}`,
		`DTEND:${stamp(d.a.slotEnd)}`,
		`SUMMARY:${escIcs(`${s.clinic.name} appointment (${d.a.reference})`)}`,
		`LOCATION:${escIcs([d.locationName, d.address1, d.area, d.city].filter(Boolean).join(', '))}`,
		`DESCRIPTION:${escIcs(`Reference ${d.a.reference}${d.doctor ? `\nWith ${d.doctor.title ?? ''} ${d.doctor.name}` : ''}${d.locationPhones[0] ? `\nPhone ${d.locationPhones[0]}` : ''}`)}`,
		'BEGIN:VALARM',
		'TRIGGER:-PT2H',
		'ACTION:DISPLAY',
		'DESCRIPTION:Appointment reminder',
		'END:VALARM',
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n');
	return new Response(ics, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': `attachment; filename="appointment-${d.a.reference}.ics"`,
			'cache-control': 'private, no-store'
		}
	});
};
