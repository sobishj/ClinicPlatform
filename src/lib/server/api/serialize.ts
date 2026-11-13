/** Stable public JSON shapes for the REST API (decoupled from table columns). */
import type { PublicLocation, PublicDoctor, PublicService } from '../queries.js';
import { fullAddress } from '../../format.js';
import { bookHref } from '../../links.js';

const abs = (origin: string, url?: string | null) => (url ? (url.startsWith('http') ? url : origin + url) : null);

export function locationOut(l: PublicLocation, origin: string) {
	return {
		id: l.id,
		slug: l.slug,
		name: l.name,
		type: l.type,
		address: {
			line1: l.addressLine1,
			line2: l.addressLine2,
			area: l.area,
			city: l.city,
			state: l.state,
			postalCode: l.postalCode,
			formatted: fullAddress(l)
		},
		phones: l.phones,
		whatsapp: l.whatsapp,
		email: l.email,
		geo: l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : null,
		directionsUrl: l.directionsUrl,
		hours: l.hours,
		closures: l.closures,
		photos: l.photos.map((p) => ({ url: abs(origin, p.url), alt: p.alt })),
		summary: l.summary,
		url: `${origin}/locations/${l.slug}`,
		bookingUrl: origin + bookHref({ location: l.slug })
	};
}

export function doctorOut(d: PublicDoctor, origin: string) {
	return {
		id: d.id,
		slug: d.slug,
		name: d.title ? `${d.title} ${d.name}` : d.name,
		qualifications: d.qualifications,
		specialities: d.specialities,
		experienceYears: d.experienceYears,
		languages: d.languages,
		summary: d.summary,
		photo: d.photo ? { url: abs(origin, d.photo.url), alt: d.photo.alt } : null,
		locations: d.branches.map((b) => ({ id: b.locationId, slug: b.slug, name: b.name, schedule: b.schedule, bookable: b.bookable })),
		url: `${origin}/doctors/${d.slug}`,
		bookingUrl: origin + bookHref({ doctor: d.slug })
	};
}

export function serviceOut(s: PublicService, origin: string, extra: { locationIds?: string[]; doctorIds?: string[] } = {}) {
	return {
		id: s.id,
		slug: s.slug,
		name: s.name,
		category: s.category,
		summary: s.summary,
		durationMinutes: s.durationMinutes,
		price: s.price != null ? { amount: s.price, from: s.priceFrom } : null,
		faqs: s.faqs,
		...extra,
		url: `${origin}/services/${s.slug}`,
		bookingUrl: origin + bookHref({ service: s.slug })
	};
}
