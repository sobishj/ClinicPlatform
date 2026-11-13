import { apiHandler, optionsHandler, ApiError } from '#lib/server/api/auth.js';
import { listLocations, listDoctors } from '#lib/server/queries.js';
import { getAvailableDays, getSlots, locationMode } from '#lib/server/booking.js';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/availability?location=<slug>[&doctor=<slug>][&date=YYYY-MM-DD][&service=<id>]
 * Request mode → bookable days with time-of-day windows.
 * Slots mode   → exact slots for `date` (or days when no date is given).
 */
export const GET: RequestHandler = apiHandler('read', async ({ locals, url }) => {
	const s = locals.settings;
	const loc = (await listLocations(locals.db)).find((l) => l.slug === url.searchParams.get('location'));
	if (!loc) throw new ApiError(400, 'invalid_location', 'Pass ?location=<slug> of an active location.');
	const doctorSlug = url.searchParams.get('doctor');
	const doctor = doctorSlug ? (await listDoctors(locals.db)).find((d) => d.slug === doctorSlug) : null;
	if (doctorSlug && !doctor) throw new ApiError(400, 'invalid_doctor', 'Unknown doctor.');
	const mode = locationMode(loc, s);
	const date = url.searchParams.get('date');
	if (mode === 'slots' && date) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'invalid_date', 'Use YYYY-MM-DD.');
		const slots = await getSlots(locals.db, s, { locationId: loc.id, doctorId: doctor?.id, date, serviceId: url.searchParams.get('service') });
		return { mode, timeZone: s.clinic.timeZone, date, slots: slots.map((x) => ({ start: new Date(x.start).toISOString(), end: new Date(x.end).toISOString(), time: x.time, doctorIds: x.doctorIds })) };
	}
	const days = await getAvailableDays(locals.db, s, { locationId: loc.id, doctorId: doctor?.id });
	return { mode, timeZone: s.clinic.timeZone, days };
});
export const OPTIONS: RequestHandler = optionsHandler;
