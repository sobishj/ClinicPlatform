import { requirePermission } from '#lib/server/auth.js';
import { appointmentWhere, filtersFromUrl, listAppointments, toCsv } from '#lib/server/appointments-admin.js';
import { audit } from '#lib/server/audit.js';
import { zonedParts } from '#lib/time.js';
import type { RequestHandler } from './$types';

/** CSV export of the current filter (max 10 000 rows). */
export const GET: RequestHandler = async (event) => {
	const user = requirePermission(event, 'appointments:export');
	const tz = event.locals.settings.clinic.timeZone;
	const { items } = await listAppointments(event.locals.db, appointmentWhere(user, filtersFromUrl(event.url)), { perPage: 10000, order: 'date' });
	const rows = items.map((r) => ({
		...r,
		doctor: r.doctorName ? `${r.doctorTitle ?? ''} ${r.doctorName}`.trim() : '',
		time: r.slotStart ? zonedParts(r.slotStart, tz).hhmm : r.timeWindow,
		created: new Date(r.createdAt).toISOString()
	}));
	const csv = toCsv(rows, [
		['reference', 'Reference'],
		['status', 'Status'],
		['preferredDate', 'Date'],
		['time', 'Time'],
		['locationName', 'Branch'],
		['doctor', 'Doctor'],
		['serviceName', 'Service'],
		['patientName', 'Patient'],
		['phone', 'Phone'],
		['email', 'Email'],
		['notes', 'Notes'],
		['source', 'Source'],
		['created', 'Received (UTC)']
	]);
	await audit(event, 'export', 'appointment', null, `Exported ${rows.length} appointments`);
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="appointments-${new Date().toISOString().slice(0, 10)}.csv"`,
			'cache-control': 'private, no-store'
		}
	});
};
