import { fail, redirect } from '@sveltejs/kit';
import { bookingContext, createAppointment, BookingError } from '#lib/server/booking.js';
import { bookingSchema } from '#lib/schemas/booking.js';
import { requireModule } from '#lib/server/modules.js';
import { zodErrors, formToObject } from '#lib/server/forms.js';
import { verifyTurnstile } from '#lib/server/turnstile.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import { phoneDigits } from '#lib/format.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireModule(locals.settings, 'booking');
	const ctx = await bookingContext(locals.db, locals.settings);
	const q = url.searchParams;
	const preset = {
		locationId: ctx.locations.find((l) => l.slug === q.get('location'))?.id ?? '',
		doctorId: ctx.doctors.find((d) => d.slug === q.get('doctor'))?.id ?? '',
		serviceId: ctx.services.find((s) => s.slug === q.get('service'))?.id ?? ''
	};
	return { ctx, preset, booking: locals.settings.booking };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals, getClientAddress } = event;
		const s = locals.settings;
		requireModule(s, 'booking');
		const form = await request.formData();
		const raw = formToObject(form);
		const { website: _hp, ...values } = raw;

		const parsed = bookingSchema({ phonePattern: s.booking.phonePattern, phoneHint: s.booking.phoneHint, requireEmail: s.booking.requireEmail }).safeParse(raw);
		if (!parsed.success) return fail(400, { values, errors: zodErrors(parsed.error) });

		const ip = clientIp(request, getClientAddress);
		const [byIp, byPhone] = await Promise.all([
			rateLimit(locals.db, `book:ip:${ip}`, s.booking.maxPerIpPerHour, 3600),
			rateLimit(locals.db, `book:phone:${phoneDigits(parsed.data.phone)}`, s.booking.maxPerPhonePerDay, 86400)
		]);
		if (!byIp.allowed || !byPhone.allowed) {
			return fail(429, { values, errors: { _form: 'We have already received several requests from you. Our team will call you — or please phone the branch directly.' } });
		}
		if (!(await verifyTurnstile(s.security.turnstileSecretKey, form.get('cf-turnstile-response') as string, ip))) {
			return fail(400, { values, errors: { _form: 'Please complete the spam check and try again.' } });
		}

		let reference: string;
		try {
			const row = await createAppointment(event, parsed.data, { source: 'web' });
			reference = row.reference;
		} catch (err) {
			if (err instanceof BookingError) return fail(err.status, { values, errors: { [err.field]: err.message } });
			throw err;
		}
		redirect(303, `/book/thanks?ref=${encodeURIComponent(reference)}`);
	}
};
