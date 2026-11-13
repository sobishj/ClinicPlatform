import { error, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { doctors, doctorLocations, doctorLeaves, locations, services, serviceDoctors } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { sanitizeHtml } from '#lib/server/sanitize.js';
import { runBatch } from '#lib/server/db/index.js';
import { uniqueSlug, nextSortOrder, optionalImage, slugSchema, seoSchema, weeklyHoursSchema, dateRangeSchema } from '#lib/server/crud.js';
import { can } from '#lib/permissions.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import type { WeeklyHours } from '#lib/types.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	title: z.string().trim().max(20).default('Dr.'),
	name: z.string().trim().min(2, 'Enter a name').max(100),
	slug: slugSchema,
	photo: optionalImage,
	photoPortrait: optionalImage,
	qualifications: z.string().trim().max(200).nullable().default(null),
	specialities: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
	registrationNumber: z.string().trim().max(60).nullable().default(null),
	experienceYears: z.number().int().min(0).max(70).nullable().default(null),
	languages: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
	summary: z.string().trim().max(400).nullable().default(null),
	bio: z.string().max(30000).nullable().default(null),
	serviceIds: z.array(z.string()).default([]),
	branches: z
		.array(z.object({ locationId: z.string(), schedule: weeklyHoursSchema, bookable: z.boolean().default(true) }))
		.max(50)
		.default([]),
	leaves: z.array(dateRangeSchema).max(100).default([]),
	featured: z.boolean().default(false),
	active: z.boolean().default(true),
	seo: seoSchema
});

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const db = event.locals.db;
	const id = event.params.id;
	const [allServices, allLocations] = await Promise.all([
		db.select({ id: services.id, name: services.name, category: services.category }).from(services).orderBy(asc(services.sortOrder)),
		db.select({ id: locations.id, name: locations.name, hours: locations.hours }).from(locations).orderBy(asc(locations.sortOrder))
	]);
	const base = { services: allServices, locations: allLocations, canWrite: can(user, 'content:write') };
	if (id === 'new') {
		return {
			...base,
			title: `New ${event.locals.settings.labels.doctor.toLowerCase()}`,
			isNew: true,
			doctor: {
				title: 'Dr.',
				name: '',
				slug: '',
				photo: null,
				photoPortrait: null,
				qualifications: '',
				specialities: [] as string[],
				registrationNumber: '',
				experienceYears: null as number | null,
				languages: ['English'],
				summary: '',
				bio: '',
				serviceIds: [] as string[],
				branches: [] as Array<{ locationId: string; schedule: WeeklyHours; bookable: boolean }>,
				leaves: [] as Array<{ startDate: string; endDate: string; reason: string }>,
				featured: false,
				active: true,
				seo: null
			}
		};
	}
	const row = await db.select().from(doctors).where(eq(doctors.id, id)).get();
	if (!row) error(404, { message: 'Not found' });
	const [links, leaves, svc] = await Promise.all([
		db.select().from(doctorLocations).where(eq(doctorLocations.doctorId, id)),
		db.select().from(doctorLeaves).where(eq(doctorLeaves.doctorId, id)).orderBy(asc(doctorLeaves.startDate)),
		db.select({ serviceId: serviceDoctors.serviceId }).from(serviceDoctors).where(eq(serviceDoctors.doctorId, id))
	]);
	const order = new Map(allLocations.map((l, i) => [l.id, i]));
	return {
		...base,
		title: row.name,
		isNew: false,
		doctor: {
			...row,
			title: row.title ?? '',
			qualifications: row.qualifications ?? '',
			registrationNumber: row.registrationNumber ?? '',
			summary: row.summary ?? '',
			bio: row.bio ?? '',
			serviceIds: svc.map((s) => s.serviceId),
			branches: links
				.sort((a, b) => (order.get(a.locationId) ?? 0) - (order.get(b.locationId) ?? 0))
				.map((l) => ({ locationId: l.locationId, schedule: l.schedule, bookable: l.bookable })),
			leaves: leaves.map((l) => ({ startDate: l.startDate, endDate: l.endDate, reason: l.reason ?? '' }))
		}
	};
};

export const actions: Actions = {
	save: async (event) => {
		requirePermission(event, 'content:write');
		const parsed = await parsePayload(event.request, schema);
		if (!parsed.ok) return parsed.failure;
		const d = parsed.data;
		const db = event.locals.db;
		const isNew = event.params.id === 'new';
		const id = isNew ? crypto.randomUUID() : event.params.id;
		const slug = await uniqueSlug(db, doctors, d.slug || d.name, isNew ? undefined : id);
		const values = {
			title: d.title || null,
			name: d.name,
			slug,
			photo: d.photo,
			photoPortrait: d.photoPortrait,
			qualifications: d.qualifications || null,
			specialities: d.specialities,
			registrationNumber: d.registrationNumber || null,
			experienceYears: d.experienceYears,
			languages: d.languages,
			summary: d.summary || null,
			bio: sanitizeHtml(d.bio),
			featured: d.featured,
			active: d.active,
			seo: d.seo
		};
		if (isNew) await db.insert(doctors).values({ id, ...values, sortOrder: await nextSortOrder(db, doctors) });
		else await db.update(doctors).set(values).where(eq(doctors.id, id));

		const uniqueBranches = [...new Map(d.branches.map((b) => [b.locationId, b])).values()];
		await runBatch(db, [
			db.delete(doctorLocations).where(eq(doctorLocations.doctorId, id)),
			...uniqueBranches.map((b) => db.insert(doctorLocations).values({ doctorId: id, ...b })),
			db.delete(doctorLeaves).where(eq(doctorLeaves.doctorId, id)),
			...d.leaves.map((l) => db.insert(doctorLeaves).values({ doctorId: id, ...l })),
			db.delete(serviceDoctors).where(eq(serviceDoctors.doctorId, id)),
			...[...new Set(d.serviceIds)].map((serviceId) => db.insert(serviceDoctors).values({ serviceId, doctorId: id }))
		]);
		await contentChanged(event, isNew ? 'create' : 'update', 'doctor', id, d.name);
		await emitEvent(event, 'doctor.updated', { id, slug, name: d.name, active: d.active, locationIds: uniqueBranches.map((b) => b.locationId) });
		if (isNew) redirect(303, `/admin/doctors/${id}?created=1`);
		return { ok: true };
	}
};
