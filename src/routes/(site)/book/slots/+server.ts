import { json, error } from '@sveltejs/kit';
import { getSlots } from '#lib/server/booking.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import type { RequestHandler } from './$types';

/** Live time slots for the booking page (JSON). */
export const GET: RequestHandler = async ({ url, locals, request, getClientAddress }) => {
	if (!locals.settings.modules.booking) error(404);
	const locationId = url.searchParams.get('location') ?? '';
	const doctorId = url.searchParams.get('doctor') || null;
	const serviceId = url.searchParams.get('service') || null;
	const date = url.searchParams.get('date') ?? '';
	if (!locationId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) error(400, 'location and date are required');
	const limit = await rateLimit(locals.db, `slots:${clientIp(request, getClientAddress)}`, 120, 600);
	if (!limit.allowed) error(429, 'Too many requests');
	const slots = await getSlots(locals.db, locals.settings, { locationId, doctorId, date, serviceId });
	return json({ slots: slots.map(({ start, time }) => ({ start, time })) }, { headers: { 'cache-control': 'no-store' } });
};
