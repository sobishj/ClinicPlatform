import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { appointments } from '#lib/server/db/schema.js';
import { appointmentDetails } from '#lib/server/booking.js';
import { describeWhen } from '#lib/server/notifications.js';
import type { PageServerLoad } from './$types';

/** Shows only non-personal details (branch, time, reference) — never the patient's data. */
export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const ref = url.searchParams.get('ref') ?? '';
	const row = /^[A-Z]{1,3}-[A-Z0-9]{6}$/.test(ref)
		? await locals.db.select({ id: appointments.id, createdAt: appointments.createdAt }).from(appointments).where(eq(appointments.reference, ref)).get()
		: null;
	// Only for recent requests, so old references can't be browsed.
	if (!row || Date.now() - row.createdAt > 7 * 86400_000) error(404, 'Page not found');
	const d = await appointmentDetails(locals.db, row.id);
	if (!d) error(404, 'Page not found');
	return {
		reference: d.a.reference,
		when: describeWhen(d, locals.settings),
		isSlot: !!d.a.slotStart,
		location: { name: d.locationName, slug: d.locationSlug, phones: d.locationPhones, whatsapp: d.locationWhatsapp, directionsUrl: d.directionsUrl, address: [d.address1, d.area, d.city].filter(Boolean).join(', ') },
		doctor: d.doctor ? `${d.doctor.title ?? ''} ${d.doctor.name}`.trim() : null
	};
};
