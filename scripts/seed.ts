/**
 * Load demo content for a clinic type so a new client starts with a complete-looking site.
 *
 *   npm run seed -- --profile=dental                 # local SQLite (DATABASE_PATH or ./data/clinic.db)
 *   npm run seed -- --profile=eye --name="Clear Eye Hospital"
 *   npm run seed -- --profile=dental --sql=seed.sql  # write SQL for D1, then:
 *   npx wrangler d1 execute clinic-db --remote --file=seed.sql
 *
 * Content tables are replaced; users, API keys and webhooks are kept.
 * Flags: --profile=dental|eye|skin|general|physio|other  --name=…  --db=path  --sql=file  --no-appointments
 */
import { writeFileSync } from 'node:fs';
import { parseArgs, openDb, dumpTables, deleteStatements } from './lib/db.js';
import { getProfile } from './profiles/index.js';
import { DEMO_LOCATIONS, DEMO_HOURS, PRIVACY_HTML, TERMS_HTML } from './profiles/shared.js';
import * as s from '../src/lib/server/db/schema.js';
import {
	CLINIC_TYPES,
	TYPE_LABELS,
	settingsSchemas,
	type ClinicType
} from '../src/lib/settings/schema.js';
import { slugify } from '../src/lib/slug.js';
import type { ImageRef } from '../src/lib/types.js';

const args = parseArgs();
const profileName = (typeof args.profile === 'string' ? args.profile : 'dental') as ClinicType;
if (!CLINIC_TYPES.includes(profileName)) {
	console.error(`Unknown profile "${profileName}". Use one of: ${CLINIC_TYPES.join(', ')}`);
	process.exit(1);
}
const sqlOut = typeof args.sql === 'string' ? args.sql : null;
const dbFile = sqlOut ? ':memory:' : typeof args.db === 'string' ? args.db : (process.env.DATABASE_PATH ?? './data/clinic.db');
const profile = getProfile(profileName);
if (typeof args.name === 'string') profile.clinic.name = args.name;

const CONTENT_TABLES = [
	'settings',
	'media',
	'locations',
	'location_closures',
	'doctors',
	'doctor_locations',
	'doctor_leaves',
	'services',
	'service_locations',
	'service_doctors',
	'certifications',
	'slides',
	'blocks',
	'pages',
	'appointments',
	'appointment_notes'
];

const { sqlite, db } = openDb(dbFile);

// Wipe content (children first). Users stay, but their branch assignments are cleared.
sqlite.pragma('foreign_keys = OFF');
for (const t of ['user_locations', ...[...CONTENT_TABLES].reverse()]) sqlite.prepare(`DELETE FROM "${t}"`).run();
sqlite.pragma('foreign_keys = ON');

const img = (url: string, alt: string, width = 1200, height = 800): ImageRef => ({ url, alt, width, height });

// ── media library entries for demo images ──
const demoMedia: Array<[string, string, number, number]> = [
	['/demo/hero-1.svg', 'Bright, calm treatment room with a window and plant', 1920, 1080],
	['/demo/hero-2.svg', 'Comfortable waiting lounge in soft daylight', 1920, 1080],
	['/demo/hero-3.svg', 'Reception area with warm lighting', 1920, 1080],
	...[1, 2, 3].map((i) => [`/demo/location-${i}.svg`, `Clinic building exterior ${i}`, 1200, 800] as [string, string, number, number]),
	...[1, 2, 3, 4, 5, 6].map((i) => [`/demo/interior-${i}.svg`, `Clinic interior ${i}`, 1200, 900] as [string, string, number, number]),
	...[1, 2, 3, 4, 5, 6].map((i) => [`/demo/doctor-${i}.svg`, `Doctor portrait placeholder ${i}`, 800, 1000] as [string, string, number, number]),
	...[1, 2, 3, 4].map((i) => [`/demo/badge-${i}.svg`, `Certification badge ${i}`, 400, 400] as [string, string, number, number]),
	['/demo/logo.svg', 'Clinic logo', 64, 64]
];
await db.insert(s.media).values(
	demoMedia.map(([url, alt, width, height]) => ({
		key: `demo${url}`,
		url,
		alt,
		mime: 'image/svg+xml',
		width,
		height,
		folder: 'demo',
		filename: url.split('/').pop()
	}))
);

// ── settings ──
const labels = { ...settingsSchemas.labels.parse({}), ...TYPE_LABELS[profileName] };
const homepage = settingsSchemas.homepage.parse({});
homepage.sections = homepage.sections.map((sec) =>
	sec.id === 'process' ? { ...sec, image: img('/demo/interior-1.svg', 'A dentist explaining a treatment plan to a patient', 1200, 900) } : sec
);
const settingRows: Record<string, unknown> = {
	clinic: settingsSchemas.clinic.parse({
		name: profile.clinic.name,
		shortName: profile.clinic.shortName,
		tagline: profile.clinic.tagline,
		clinicType: profileName,
		logo: img('/demo/logo.svg', `${profile.clinic.name} logo`, 64, 64),
		phones: ['+91 484 000 0100'],
		whatsapp: '+91 90000 00100',
		email: profile.clinic.email,
		social: { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', youtube: '', linkedin: '', x: '', google: '' },
		googleReviewsUrl: 'https://www.google.com/maps',
		foundedYear: 2008
	}),
	labels,
	modules: settingsSchemas.modules.parse({ membership: profile.membership.length > 0 }),
	homepage,
	disclaimer: { enabled: true, text: settingsSchemas.disclaimer.parse({}).text },
	seo: settingsSchemas.seo.parse({
		defaultDescription: `${profile.clinic.name} — ${profile.clinic.tagline}. Book an appointment at a branch near you.`
	})
};
await db.insert(s.settings).values(Object.entries(settingRows).map(([key, value]) => ({ key, value })));

// ── locations ──
const locationIds: string[] = [];
for (const [i, l] of DEMO_LOCATIONS.entries()) {
	const id = crypto.randomUUID();
	locationIds.push(id);
	await db.insert(s.locations).values({
		id,
		slug: slugify(l.name),
		name: l.name,
		type: l.type,
		addressLine1: l.addressLine1,
		area: l.area,
		city: l.city,
		state: l.state,
		postalCode: l.postalCode,
		phones: l.phones,
		whatsapp: l.whatsapp,
		email: l.email,
		notificationEmail: l.email,
		latitude: l.latitude,
		longitude: l.longitude,
		mapEmbedUrl: `https://www.google.com/maps?q=${l.latitude},${l.longitude}&z=15&output=embed`,
		directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`,
		hours: DEMO_HOURS[i],
		photos: [img(l.photo, `${profile.clinic.name}, ${l.name} branch`), img(`/demo/interior-${i + 2}.svg`, `Treatment room at ${l.name}`, 1200, 900)],
		summary: l.summary,
		description: `<p>${l.summary}</p><p>Our ${l.name} team is happy to help with directions, parking and accessibility questions — just call ahead.</p>`,
		sortOrder: i
	});
}
// A demo closure on the satellite clinic.
await db.insert(s.locationClosures).values({ locationId: locationIds[2], startDate: '2026-12-25', endDate: '2026-12-25', reason: 'Christmas' });

// ── services ──
const serviceIds = new Map<string, string>();
for (const [i, svc] of profile.services.entries()) {
	const id = crypto.randomUUID();
	serviceIds.set(svc.name, id);
	await db.insert(s.services).values({
		id,
		slug: slugify(svc.name),
		name: svc.name,
		category: svc.category,
		icon: svc.icon,
		image: img(`/demo/interior-${(i % 6) + 1}.svg`, svc.name, 1200, 900),
		summary: svc.summary,
		content: svc.content,
		benefits: svc.benefits,
		steps: svc.steps,
		faqs: svc.faqs,
		durationMinutes: svc.durationMinutes,
		price: svc.price ?? null,
		priceFrom: true,
		sortOrder: i
	});
	// Satellite clinic offers only general services.
	const at = i < 3 || svc.category.match(/General|Primary|Preventive|Children|Paediatric/) ? locationIds : locationIds.slice(0, 2);
	await db.insert(s.serviceLocations).values(at.map((locationId) => ({ serviceId: id, locationId })));
}

// ── doctors ──
for (const [i, d] of profile.doctors.entries()) {
	const id = crypto.randomUUID();
	await db.insert(s.doctors).values({
		id,
		slug: slugify(d.name),
		title: profileName === 'physio' && !d.qualifications.startsWith('MBBS') ? '' : 'Dr.',
		name: d.name,
		photo: img(`/demo/doctor-${i + 1}.svg`, `Portrait of ${d.name}`, 800, 1000),
		photoPortrait: img(`/demo/doctor-${i + 1}.svg`, `Portrait of ${d.name}`, 800, 1000),
		qualifications: d.qualifications,
		specialities: d.specialities,
		registrationNumber: d.registrationNumber,
		experienceYears: d.experienceYears,
		languages: d.languages,
		summary: d.summary,
		bio: d.bio,
		featured: d.featured ?? false,
		sortOrder: i
	});
	await db.insert(s.doctorLocations).values(
		d.branches.map((b) => ({ doctorId: id, locationId: locationIds[b.location], schedule: b.schedule, bookable: true }))
	);
	const svcIds = d.services.map((n) => serviceIds.get(n)).filter((x): x is string => !!x);
	if (svcIds.length) await db.insert(s.serviceDoctors).values(svcIds.map((serviceId) => ({ serviceId, doctorId: id })));
}

// ── hero slides ──
await db.insert(s.slides).values(
	profile.slides.map((sl, i) => ({
		image: img(`/demo/hero-${(i % 3) + 1}.svg`, demoMedia[i % 3][1], 1920, 1080),
		heading: sl.heading,
		subheading: sl.subheading,
		buttonText: sl.buttonText,
		buttonLink: sl.buttonLink,
		align: sl.align,
		overlay: 30,
		sortOrder: i
	}))
);

// ── simple collections ──
const blockRows: Array<{ collection: string; data: Record<string, unknown>; sortOrder: number }> = [];
const push = (collection: string, items: Array<Record<string, unknown>>) =>
	items.forEach((data, sortOrder) => blockRows.push({ collection, data, sortOrder }));
push('intents', profile.intents);
push('process', profile.process);
push('technology', profile.technology);
push('amenities', profile.amenities);
push('testimonials', profile.testimonials.map((t) => ({ ...t, url: '' })));
push('faqs', profile.faqs.map((f) => ({ category: '', ...f })));
push('insurance', profile.insurance);
push(
	'membership',
	profile.membership.map((m) => ({ highlighted: false, ctaText: 'Join now', ctaLink: '/contact', ...m }))
);
push(
	'gallery',
	[1, 2, 3, 4, 5, 6].map((i) => ({
		image: img(`/demo/interior-${i}.svg`, `Clinic interior ${i}`, 1200, 900),
		caption: ['Reception', 'Treatment room', 'Kids’ corner', 'Sterilisation room', 'Lounge', 'Consultation room'][i - 1],
		category: i < 4 ? 'Clinic' : 'Facilities'
	}))
);
await db.insert(s.blocks).values(blockRows);

// ── certifications ──
await db.insert(s.certifications).values(
	profile.certifications.map((c, i) => ({ ...c, image: img(`/demo/badge-${(i % 4) + 1}.svg`, `${c.title} badge`, 400, 400), sortOrder: i }))
);

// ── pages ──
const now = Date.now();
await db.insert(s.pages).values([
	{ kind: 'page', slug: 'about', title: `About ${profile.clinic.name}`, excerpt: profile.clinic.tagline, content: profile.about, coverImage: img('/demo/hero-2.svg', 'Our clinic', 1920, 1080) },
	{ kind: 'page', slug: 'privacy', title: 'Privacy Policy', content: PRIVACY_HTML(profile.clinic.name), showInFooter: true },
	{ kind: 'page', slug: 'terms', title: 'Terms of Use', content: TERMS_HTML(profile.clinic.name), showInFooter: true },
	{ kind: 'post', slug: 'first-visit-guide', title: 'What to expect at your first visit', excerpt: 'A short guide to your first appointment with us.', content: '<p>Your first visit is mostly a conversation and a careful check-up. Bring any previous reports and a list of your medicines.</p>', coverImage: img('/demo/interior-3.svg', 'Reception', 1200, 900), publishedAt: now - 86400000 * 10 },
	{ kind: 'post', slug: 'caring-for-your-family', title: 'Simple habits for a healthy family', excerpt: 'Small daily routines that make a big difference.', content: '<p>Regular check-ups, a balanced diet and a simple daily routine prevent most common problems.</p>', coverImage: img('/demo/interior-5.svg', 'Lounge', 1200, 900), publishedAt: now - 86400000 * 3 }
]);

// ── demo appointment requests ──
if (!args['no-appointments']) {
	const statuses = ['new', 'new', 'new', 'confirmed', 'completed', 'cancelled'] as const;
	const names = ['Deepa Joseph', 'Kiran Kumar', 'Nisha Thomas', 'Abdul Rahman', 'Gita Varma', 'Manoj Pillai'];
	const svcList = [...serviceIds.values()];
	const today = new Date();
	for (let i = 0; i < names.length; i++) {
		const d = new Date(today.getTime() + (i - 1) * 86400000);
		await db.insert(s.appointments).values({
			reference: `DEMO${String(1001 + i)}`,
			locationId: locationIds[i % locationIds.length],
			serviceId: svcList[i % svcList.length],
			preferredDate: d.toISOString().slice(0, 10),
			timeWindow: (['morning', 'afternoon', 'evening'] as const)[i % 3],
			patientName: names[i],
			phone: `+91 90000 1000${i}`,
			notes: i === 0 ? 'Sensitive tooth on the lower left side.' : null,
			consentAt: now - i * 3600000,
			status: statuses[i],
			source: i === 3 ? 'phone' : 'web',
			createdAt: now - i * 3600000
		});
	}
}

await db
	.insert(s.settings)
	.values({ key: '_contentVersion', value: String(now) })
	.onConflictDoUpdate({ target: s.settings.key, set: { value: String(now) } });

if (sqlOut) {
	const out = deleteStatements([...CONTENT_TABLES, 'user_locations'].filter((t) => t !== 'settings')) +
		`DELETE FROM "settings" WHERE key NOT IN ('email','security','integrations','chatbot','analytics');\n` +
		dumpTables(sqlite, CONTENT_TABLES).replace(/^INSERT INTO "settings"/gm, 'INSERT OR REPLACE INTO "settings"');
	writeFileSync(sqlOut, out);
	console.log(`✓ Wrote ${sqlOut}. Apply with:  npx wrangler d1 execute clinic-db --remote --file=${sqlOut}`);
} else {
	console.log(`✓ Seeded "${profile.clinic.name}" (${profileName}) into ${dbFile}`);
	const users = sqlite.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number };
	if (!users.n) console.log('  No admin user yet: run  npm run create-admin -- --email=you@example.com  or open /admin/setup');
}
sqlite.close();
