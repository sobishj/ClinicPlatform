/** JSON-LD (schema.org) builders. Keep output small and accurate. */
import { openingHoursSpec } from './time.js';
import { fullAddress } from './format.js';
import type { WeeklyHours, ImageRef } from './types.js';

interface ClinicLike {
	name: string;
	tagline?: string;
	clinicType: string;
	logo: ImageRef | null;
	phones: string[];
	email?: string;
	social: Record<string, string | undefined>;
	foundedYear?: number | null;
}

interface LocationLike {
	slug: string;
	name: string;
	addressLine1: string;
	addressLine2?: string | null;
	area?: string | null;
	city: string;
	state?: string | null;
	postalCode?: string | null;
	country?: string | null;
	phones: string[];
	email?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	hours: WeeklyHours;
	photos?: ImageRef[];
	directionsUrl?: string | null;
}

const abs = (origin: string, url?: string | null) => (url ? (url.startsWith('http') ? url : origin + url) : undefined);

/** Organisation type: "Dentist" for dental clinics, otherwise MedicalOrganization. */
export function orgType(clinicType: string) {
	return clinicType === 'dental' ? 'Dentist' : 'MedicalOrganization';
}
export function branchType(clinicType: string) {
	return clinicType === 'dental' ? 'Dentist' : 'MedicalClinic';
}

export function organizationLd(clinic: ClinicLike, origin: string, locations: LocationLike[] = []) {
	const sameAs = Object.values(clinic.social).filter((v): v is string => !!v && v.startsWith('http'));
	return {
		'@context': 'https://schema.org',
		'@type': orgType(clinic.clinicType),
		'@id': `${origin}/#organization`,
		name: clinic.name,
		description: clinic.tagline || undefined,
		url: origin + '/',
		logo: abs(origin, clinic.logo?.url),
		image: abs(origin, clinic.logo?.url),
		telephone: clinic.phones[0],
		email: clinic.email || undefined,
		foundingDate: clinic.foundedYear ? String(clinic.foundedYear) : undefined,
		sameAs: sameAs.length ? sameAs : undefined,
		...(clinic.clinicType === 'dental' && locations[0] ? { address: postalAddress(locations[0]) } : {}),
		department: locations.length ? locations.map((l) => ({ '@id': `${origin}/locations/${l.slug}#clinic` })) : undefined
	};
}

function postalAddress(l: LocationLike) {
	return {
		'@type': 'PostalAddress',
		streetAddress: [l.addressLine1, l.addressLine2, l.area].filter(Boolean).join(', '),
		addressLocality: l.city,
		addressRegion: l.state || undefined,
		postalCode: l.postalCode || undefined,
		addressCountry: l.country || 'IN'
	};
}

export function locationLd(l: LocationLike, clinic: ClinicLike, origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': branchType(clinic.clinicType),
		'@id': `${origin}/locations/${l.slug}#clinic`,
		name: `${clinic.name} — ${l.name}`,
		url: `${origin}/locations/${l.slug}`,
		image: l.photos?.length ? l.photos.map((p) => abs(origin, p.url)) : abs(origin, clinic.logo?.url),
		telephone: l.phones[0] ?? clinic.phones[0],
		email: l.email || undefined,
		address: postalAddress(l),
		geo: l.latitude != null && l.longitude != null ? { '@type': 'GeoCoordinates', latitude: l.latitude, longitude: l.longitude } : undefined,
		hasMap: l.directionsUrl || undefined,
		openingHoursSpecification: openingHoursSpec(l.hours),
		parentOrganization: { '@id': `${origin}/#organization` },
		description: fullAddress(l)
	};
}

export function physicianLd(
	d: { slug: string; title?: string | null; name: string; photo?: ImageRef | null; qualifications?: string | null; specialities: string[]; summary?: string | null; languages: string[] },
	branches: Array<{ slug: string }>,
	origin: string
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Physician',
		'@id': `${origin}/doctors/${d.slug}#physician`,
		name: `${d.title ? d.title + ' ' : ''}${d.name}`,
		url: `${origin}/doctors/${d.slug}`,
		image: abs(origin, d.photo?.url),
		description: d.summary || undefined,
		medicalSpecialty: d.specialities.length ? d.specialities : undefined,
		knowsLanguage: d.languages.length ? d.languages : undefined,
		hasCredential: d.qualifications ? { '@type': 'EducationalOccupationalCredential', name: d.qualifications } : undefined,
		worksFor: { '@id': `${origin}/#organization` },
		location: branches.map((b) => ({ '@id': `${origin}/locations/${b.slug}#clinic` }))
	};
}

export function faqLd(faqs: Array<{ question: string; answer: string }>) {
	if (!faqs.length) return null;
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.question,
			acceptedAnswer: { '@type': 'Answer', text: f.answer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
		}))
	};
}

export function serviceLd(s: { slug: string; name: string; summary?: string | null; image?: ImageRef | null }, origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'MedicalProcedure',
		name: s.name,
		description: s.summary || undefined,
		url: `${origin}/services/${s.slug}`,
		image: abs(origin, s.image?.url),
		provider: { '@id': `${origin}/#organization` }
	};
}

export function breadcrumbLd(items: Array<{ name: string; url: string }>, origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(origin, it.url) }))
	};
}

/** Serialise for a <script type="application/ld+json"> without allowing </script> breakouts. */
export function jsonLdScript(data: unknown): string {
	const json = JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v)).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}
