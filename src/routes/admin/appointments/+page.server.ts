import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { locations, doctors, doctorLocations, services } from '#lib/server/db/schema.js';
import { requirePermission, requireLocationAccess } from '#lib/server/auth.js';
import { appointmentWhere, filtersFromUrl, listAppointments, statusCounts } from '#lib/server/appointments-admin.js';
import { createAppointment, BookingError } from '#lib/server/booking.js';
import { bookingSchema } from '#lib/schemas/booking.js';
import { parsePayload } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import { can, locationScope } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'appointments:read');
	const db = event.locals.db;
	const filters = filtersFromUrl(event.url);
	const page = Number(event.url.searchParams.get('page')) || 1;
	const scope = locationScope(user);
	const [list, counts, locs, docs, links, svcs] = await Promise.all([
		listAppointments(db, appointmentWhere(user, filters), { page }),
		statusCounts(db, user),
		db.select({ id: locations.id, name: locations.name, phones: locations.phones, bookingMode: locations.bookingMode }).from(locations).orderBy(asc(locations.sortOrder)),
		db.select({ id: doctors.id, title: doctors.title, name: doctors.name }).from(doctors).where(eq(doctors.active, true)).orderBy(asc(doctors.sortOrder)),
		db.select({ doctorId: doctorLocations.doctorId, locationId: doctorLocations.locationId }).from(doctorLocations),
		db.select({ id: services.id, name: services.name }).from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder))
	]);
	const visibleLocations = scope ? locs.filter((l) => scope.includes(l.id)) : locs;
	const s = event.locals.settings;
	return {
		title: 'Appointments',
		...list,
		counts,
		filters,
		locations: visibleLocations,
		doctors: docs.map((d) => ({ ...d, locationIds: links.filter((x) => x.doctorId === d.id).map((x) => x.locationId) })),
		services: svcs,
		canExport: can(user, 'appointments:export'),
		slotsEnabled: s.booking.mode === 'slots' || locs.some((l) => l.bookingMode === 'slots'),
		whatsappTemplate: s.notifications.whatsappTemplate
	};
};

export const actions: Actions = {
	/** Staff add a request taken by phone. */
	create: async (event) => {
		const user = requirePermission(event, 'appointments:write');
		// Staff may enter any reasonable phone number format.
		const schema = bookingSchema({ phonePattern: '^\\+?[0-9][0-9\\s-]{6,18}$', phoneHint: 'digits only' });
		const parsed = await parsePayload(event.request, schema);
		if (!parsed.ok) return parsed.failure;
		requireLocationAccess(user, parsed.data.locationId);
		try {
			const row = await createAppointment(event, parsed.data, { source: 'phone', staffOverride: true });
			await audit(event, 'create', 'appointment', row.id, `${row.reference} (phone) ${row.patientName}`);
			return { ok: true, id: row.id, reference: row.reference };
		} catch (err) {
			if (err instanceof BookingError) return fail(err.status, { errors: { [err.field]: err.message }, message: err.message });
			throw err;
		}
	}
};
