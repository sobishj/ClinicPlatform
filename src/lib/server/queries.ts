/** Read-only queries for the public website and the public API. Only active content is returned. */
import { and, asc, desc, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { DB } from './db/index.js';
import {
	locations,
	locationClosures,
	doctors,
	doctorLocations,
	doctorLeaves,
	services,
	serviceLocations,
	serviceDoctors,
	certifications,
	slides,
	blocks,
	pages
} from './db/schema.js';
import type { CollectionKey } from '../content/collections.js';
import type { WeeklyHours } from '../types.js';

const today = () => new Date().toISOString().slice(0, 10);

// ───────── locations ─────────

export async function listLocations(db: DB) {
	const rows = await db.select().from(locations).where(eq(locations.active, true)).orderBy(asc(locations.sortOrder), asc(locations.name));
	if (!rows.length) return [];
	const closures = await db
		.select()
		.from(locationClosures)
		.where(and(inArray(locationClosures.locationId, rows.map((r) => r.id)), gte(locationClosures.endDate, today())))
		.orderBy(asc(locationClosures.startDate));
	return rows.map((r) => ({
		...r,
		closures: closures.filter((c) => c.locationId === r.id).map(({ startDate, endDate, reason }) => ({ startDate, endDate, reason }))
	}));
}
export type PublicLocation = Awaited<ReturnType<typeof listLocations>>[number];

export async function getLocation(db: DB, slug: string) {
	const all = await listLocations(db);
	const loc = all.find((l) => l.slug === slug);
	if (!loc) return null;
	const [docs, svc] = await Promise.all([
		db
			.select({ doctor: doctors, schedule: doctorLocations.schedule, bookable: doctorLocations.bookable })
			.from(doctorLocations)
			.innerJoin(doctors, eq(doctors.id, doctorLocations.doctorId))
			.where(and(eq(doctorLocations.locationId, loc.id), eq(doctors.active, true)))
			.orderBy(asc(doctors.sortOrder)),
		db
			.select({ id: services.id, slug: services.slug, name: services.name, icon: services.icon, category: services.category, summary: services.summary })
			.from(serviceLocations)
			.innerJoin(services, eq(services.id, serviceLocations.serviceId))
			.where(and(eq(serviceLocations.locationId, loc.id), eq(services.active, true)))
			.orderBy(asc(services.sortOrder))
	]);
	return { location: loc, others: all.filter((l) => l.id !== loc.id), doctors: docs.map((d) => ({ ...d.doctor, schedule: d.schedule, bookable: d.bookable })), services: svc };
}

// ───────── doctors ─────────

export async function listDoctors(db: DB, opts: { featuredOnly?: boolean } = {}) {
	const conds = [eq(doctors.active, true)];
	if (opts.featuredOnly) conds.push(eq(doctors.featured, true));
	const rows = await db.select().from(doctors).where(and(...conds)).orderBy(asc(doctors.sortOrder), asc(doctors.name));
	if (!rows.length) return [];
	const links = await db
		.select({ doctorId: doctorLocations.doctorId, locationId: doctorLocations.locationId, schedule: doctorLocations.schedule, bookable: doctorLocations.bookable, name: locations.name, slug: locations.slug, sortOrder: locations.sortOrder })
		.from(doctorLocations)
		.innerJoin(locations, eq(locations.id, doctorLocations.locationId))
		.where(and(inArray(doctorLocations.doctorId, rows.map((r) => r.id)), eq(locations.active, true)))
		.orderBy(asc(locations.sortOrder));
	return rows.map((r) => ({
		...r,
		branches: links.filter((l) => l.doctorId === r.id).map(({ locationId, name, slug, schedule, bookable }) => ({ locationId, name, slug, schedule, bookable }))
	}));
}
export type PublicDoctor = Awaited<ReturnType<typeof listDoctors>>[number];

export async function getDoctor(db: DB, slug: string) {
	const all = await listDoctors(db);
	const doctor = all.find((d) => d.slug === slug);
	if (!doctor) return null;
	const [svc, leaves] = await Promise.all([
		db
			.select({ id: services.id, slug: services.slug, name: services.name, icon: services.icon })
			.from(serviceDoctors)
			.innerJoin(services, eq(services.id, serviceDoctors.serviceId))
			.where(and(eq(serviceDoctors.doctorId, doctor.id), eq(services.active, true)))
			.orderBy(asc(services.sortOrder)),
		db.select().from(doctorLeaves).where(and(eq(doctorLeaves.doctorId, doctor.id), gte(doctorLeaves.endDate, today())))
	]);
	return { doctor, services: svc, leaves, others: all.filter((d) => d.id !== doctor.id).slice(0, 3) };
}

// ───────── services ─────────

export async function listServices(db: DB) {
	return db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder), asc(services.name));
}
export type PublicService = Awaited<ReturnType<typeof listServices>>[number];

export function groupByCategory<T extends { category: string | null }>(items: T[], fallback = 'Other'): Array<{ category: string; items: T[] }> {
	const map = new Map<string, T[]>();
	for (const i of items) {
		const c = i.category?.trim() || fallback;
		if (!map.has(c)) map.set(c, []);
		map.get(c)!.push(i);
	}
	return [...map.entries()].map(([category, items]) => ({ category, items }));
}

export async function getService(db: DB, slug: string) {
	const svc = await db.select().from(services).where(and(eq(services.slug, slug), eq(services.active, true))).get();
	if (!svc) return null;
	const [locs, docs, related] = await Promise.all([
		db
			.select({ id: locations.id, slug: locations.slug, name: locations.name, area: locations.area, city: locations.city })
			.from(serviceLocations)
			.innerJoin(locations, eq(locations.id, serviceLocations.locationId))
			.where(and(eq(serviceLocations.serviceId, svc.id), eq(locations.active, true)))
			.orderBy(asc(locations.sortOrder)),
		db
			.select({ id: doctors.id, slug: doctors.slug, title: doctors.title, name: doctors.name, photo: doctors.photo, qualifications: doctors.qualifications, specialities: doctors.specialities })
			.from(serviceDoctors)
			.innerJoin(doctors, eq(doctors.id, serviceDoctors.doctorId))
			.where(and(eq(serviceDoctors.serviceId, svc.id), eq(doctors.active, true)))
			.orderBy(asc(doctors.sortOrder)),
		svc.category
			? db
					.select({ slug: services.slug, name: services.name, icon: services.icon, summary: services.summary })
					.from(services)
					.where(and(eq(services.category, svc.category), eq(services.active, true)))
					.orderBy(asc(services.sortOrder))
			: Promise.resolve([])
	]);
	return { service: svc, locations: locs, doctors: docs, related: related.filter((r) => r.slug !== svc.slug).slice(0, 3) };
}

// ───────── other content ─────────

export async function listCertifications(db: DB) {
	return db.select().from(certifications).where(eq(certifications.active, true)).orderBy(asc(certifications.sortOrder));
}

export async function listSlides(db: DB) {
	return db.select().from(slides).where(eq(slides.active, true)).orderBy(asc(slides.sortOrder));
}

export async function listBlocks<T = Record<string, unknown>>(db: DB, collection: CollectionKey) {
	const rows = await db
		.select({ id: blocks.id, data: blocks.data })
		.from(blocks)
		.where(and(eq(blocks.collection, collection), eq(blocks.active, true)))
		.orderBy(asc(blocks.sortOrder));
	return rows.map((r) => ({ id: r.id, ...(r.data as T) }));
}

export async function getPage(db: DB, kind: 'page' | 'post', slug: string) {
	return db
		.select()
		.from(pages)
		.where(and(eq(pages.kind, kind), eq(pages.slug, slug), eq(pages.published, true)))
		.get();
}

export async function listPosts(db: DB, limit = 50) {
	return db
		.select({ slug: pages.slug, title: pages.title, excerpt: pages.excerpt, coverImage: pages.coverImage, publishedAt: pages.publishedAt })
		.from(pages)
		.where(and(eq(pages.kind, 'post'), eq(pages.published, true), isNotNull(pages.publishedAt), lte(pages.publishedAt, Date.now())))
		.orderBy(desc(pages.publishedAt))
		.limit(limit);
}

export async function footerPages(db: DB) {
	return db
		.select({ slug: pages.slug, title: pages.title })
		.from(pages)
		.where(and(eq(pages.kind, 'page'), eq(pages.published, true), eq(pages.showInFooter, true)))
		.orderBy(asc(pages.title));
}

/** Minimal data for header menus, footer and the mobile bar (loaded on every public page). */
export async function navData(db: DB) {
	const [svc, locs, legal] = await Promise.all([
		db
			.select({ slug: services.slug, name: services.name, category: services.category })
			.from(services)
			.where(eq(services.active, true))
			.orderBy(asc(services.sortOrder)),
		listLocations(db),
		footerPages(db)
	]);
	return {
		services: svc,
		locations: locs.map((l) => ({
			id: l.id,
			slug: l.slug,
			name: l.name,
			type: l.type,
			addressLine1: l.addressLine1,
			addressLine2: l.addressLine2,
			area: l.area,
			city: l.city,
			state: l.state,
			postalCode: l.postalCode,
			phones: l.phones,
			whatsapp: l.whatsapp,
			email: l.email,
			hours: l.hours as WeeklyHours,
			closures: l.closures
		})),
		legal
	};
}
export type NavData = Awaited<ReturnType<typeof navData>>;
