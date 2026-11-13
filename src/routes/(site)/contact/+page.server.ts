import { fail } from '@sveltejs/kit';
import { messages } from '#lib/server/db/schema.js';
import { listLocations, listBlocks } from '#lib/server/queries.js';
import { contactSchema } from '#lib/schemas/public.js';
import { zodErrors, formToObject } from '#lib/server/forms.js';
import { verifyTurnstile } from '#lib/server/turnstile.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import { getEmailProvider, background } from '#lib/server/platform.js';
import { layout, table, esc } from '#lib/server/email/templates.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [locations, faqs] = await Promise.all([
		listLocations(locals.db),
		locals.settings.modules.faq ? listBlocks<{ question: string; answer: string }>(locals.db, 'faqs') : Promise.resolve([])
	]);
	return { locations, faqs: faqs.slice(0, 6) };
};

export const actions: Actions = {
	default: async ({ request, locals, platform, getClientAddress }) => {
		const s = locals.settings;
		const form = await request.formData();
		const raw = formToObject(form);
		const values = { name: raw.name ?? '', phone: raw.phone ?? '', email: raw.email ?? '', locationId: raw.locationId ?? '', message: raw.message ?? '' };
		const parsed = contactSchema(s.booking.phonePattern, s.booking.phoneHint).safeParse(raw);
		if (!parsed.success) return fail(400, { values, errors: zodErrors(parsed.error) });
		const d = parsed.data;
		if (!d.phone && !d.email) return fail(400, { values, errors: { phone: 'Please give a phone number or an email so we can reply' } });

		const ip = clientIp(request, getClientAddress);
		const limit = await rateLimit(locals.db, `contact:${ip}`, 5, 3600);
		if (!limit.allowed) return fail(429, { values, errors: { _form: 'Too many messages from this connection. Please call us instead.' } });
		if (!(await verifyTurnstile(s.security.turnstileSecretKey, form.get('cf-turnstile-response') as string, ip))) {
			return fail(400, { values, errors: { _form: 'Please complete the spam check and try again.' } });
		}

		const locations = await listLocations(locals.db);
		const loc = locations.find((l) => l.id === d.locationId);
		await locals.db.insert(messages).values({
			locationId: loc?.id ?? null,
			name: d.name,
			phone: d.phone || null,
			email: d.email || null,
			body: d.message,
			consentAt: Date.now()
		});

		const to = loc?.notificationEmail || s.notifications.adminEmail || s.clinic.email;
		const provider = await getEmailProvider(s);
		if (provider && to) {
			background(
				platform,
				provider.send({
					to,
					replyTo: d.email || undefined,
					subject: `New message from ${d.name} (website)`,
					html: layout(s, 'New message from the website', table([['Name', d.name], ['Phone', d.phone], ['Email', d.email], ['Branch', loc?.name]]) + `<p style="white-space:pre-wrap;margin-top:16px">${esc(d.message)}</p>`)
				})
			);
		}
		return { sent: true };
	}
};
