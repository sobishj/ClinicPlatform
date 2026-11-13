import { apiHandler, optionsHandler } from '#lib/server/api/auth.js';
import { navData } from '#lib/server/queries.js';
import type { RequestHandler } from './$types';

/** Clinic overview — handy context for chatbots and other integrations. */
export const GET: RequestHandler = apiHandler('read', async ({ locals, url }) => {
	const s = locals.settings;
	const nav = await navData(locals.db);
	return {
		name: s.clinic.name,
		tagline: s.clinic.tagline,
		clinicType: s.clinic.clinicType,
		phones: s.clinic.phones,
		whatsapp: s.clinic.whatsapp,
		email: s.clinic.email,
		timeZone: s.clinic.timeZone,
		currency: s.clinic.currency,
		labels: s.labels,
		booking: {
			enabled: s.modules.booking,
			mode: s.booking.mode,
			url: `${url.origin}/book`,
			deepLink: `${url.origin}/book?location={locationSlug}&doctor={doctorSlug}&service={serviceSlug}`,
			note: 'All query parameters are optional slugs; the booking form opens pre-filled.'
		},
		locations: nav.locations.map((l) => ({ slug: l.slug, name: l.name })),
		services: nav.services.map((x) => ({ slug: x.slug, name: x.name, category: x.category }))
	};
});
export const OPTIONS: RequestHandler = optionsHandler;
