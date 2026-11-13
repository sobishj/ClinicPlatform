import { requirePermission } from '#lib/server/auth.js';
import { appointmentWhere, listAppointments } from '#lib/server/appointments-admin.js';
import { addDays, weekdayOf, zonedParts } from '#lib/time.js';
import { WEEKDAYS } from '#lib/types.js';
import type { PageServerLoad } from './$types';

/** Week agenda (Mon–Sun) of appointments, for clinics using live slots. */
export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'appointments:read');
	const tz = event.locals.settings.clinic.timeZone;
	const requested = event.url.searchParams.get('week');
	const anchor = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : zonedParts(Date.now(), tz).ymd;
	const monday = addDays(anchor, -WEEKDAYS.indexOf(weekdayOf(anchor)));
	const sunday = addDays(monday, 6);
	const locationId = event.url.searchParams.get('location') ?? undefined;
	const { items } = await listAppointments(event.locals.db, appointmentWhere(user, { from: monday, to: sunday, locationId }), { perPage: 2000, order: 'date' });
	const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((ymd) => ({
		ymd,
		items: items.filter((a) => a.preferredDate === ymd && a.status !== 'cancelled')
	}));
	return { title: 'Calendar', monday, days, prev: addDays(monday, -7), next: addDays(monday, 7), locationId: locationId ?? '' };
};
