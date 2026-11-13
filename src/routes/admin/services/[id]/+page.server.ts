import { error, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { services, serviceLocations, serviceDoctors, locations, doctors } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { sanitizeHtml } from '#lib/server/sanitize.js';
import { runBatch } from '#lib/server/db/index.js';
import { uniqueSlug, nextSortOrder, optionalImage, slugSchema, seoSchema } from '#lib/server/crud.js';
import { can } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	name: z.string().trim().min(2, 'Enter a name').max(120),
	slug: slugSchema,
	category: z.string().trim().max(80).nullable().default(null),
	icon: z.string().trim().max(40).nullable().default(null),
	image: optionalImage,
	summary: z.string().trim().max(400).nullable().default(null),
	content: z.string().max(50000).nullable().default(null),
	benefits: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
	steps: z.array(z.object({ title: z.string().trim().min(1, 'Each step needs a title').max(120), description: z.string().trim().max(500).optional() })).max(20).default([]),
	faqs: z.array(z.object({ question: z.string().trim().min(1, 'Each FAQ needs a question').max(200), answer: z.string().trim().min(1, 'Each FAQ needs an answer').max(2000) })).max(30).default([]),
	durationMinutes: z.number().int().min(5).max(600).nullable().default(null),
	price: z.number().int().min(0).nullable().default(null),
	priceFrom: z.boolean().default(true),
	locationIds: z.array(z.string()).default([]),
	doctorIds: z.array(z.string()).default([]),
	active: z.boolean().default(true),
	seo: seoSchema
});

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const db = event.locals.db;
	const id = event.params.id;
	const [locs, docs, cats] = await Promise.all([
		db.select({ id: locations.id, name: locations.name }).from(locations).orderBy(asc(locations.sortOrder)),
		db.select({ id: doctors.id, name: doctors.name, title: doctors.title }).from(doctors).orderBy(asc(doctors.sortOrder)),
		db.selectDistinct({ category: services.category }).from(services)
	]);
	const base = {
		locations: locs,
		doctors: docs,
		categories: cats.map((c) => c.category).filter((c): c is string => !!c),
		canWrite: can(user, 'content:write')
	};
	if (id === 'new') {
		return {
			...base,
			title: `New ${event.locals.settings.labels.service.toLowerCase()}`,
			isNew: true,
			service: {
				name: '',
				slug: '',
				category: '',
				icon: '',
				image: null,
				summary: '',
				content: '',
				benefits: [] as string[],
				steps: [] as Array<{ title: string; description?: string }>,
				faqs: [] as Array<{ question: string; answer: string }>,
				durationMinutes: null as number | null,
				price: null as number | null,
				priceFrom: true,
				locationIds: locs.map((l) => l.id),
				doctorIds: [] as string[],
				active: true,
				seo: null
			}
		};
	}
	const row = await db.select().from(services).where(eq(services.id, id)).get();
	if (!row) error(404, 'Not found');
	const [sl, sd] = await Promise.all([
		db.select({ id: serviceLocations.locationId }).from(serviceLocations).where(eq(serviceLocations.serviceId, id)),
		db.select({ id: serviceDoctors.doctorId }).from(serviceDoctors).where(eq(serviceDoctors.serviceId, id))
	]);
	return {
		...base,
		title: row.name,
		isNew: false,
		service: {
			...row,
			category: row.category ?? '',
			icon: row.icon ?? '',
			summary: row.summary ?? '',
			content: row.content ?? '',
			locationIds: sl.map((x) => x.id),
			doctorIds: sd.map((x) => x.id)
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
		const slug = await uniqueSlug(db, services, d.slug || d.name, isNew ? undefined : id);
		const values = {
			name: d.name,
			slug,
			category: d.category || null,
			icon: d.icon || null,
			image: d.image,
			summary: d.summary || null,
			content: sanitizeHtml(d.content),
			benefits: d.benefits,
			steps: d.steps,
			faqs: d.faqs.map((f) => ({ question: f.question, answer: sanitizeHtml(f.answer) || f.answer })),
			durationMinutes: d.durationMinutes,
			price: d.price,
			priceFrom: d.priceFrom,
			active: d.active,
			seo: d.seo
		};
		if (isNew) await db.insert(services).values({ id, ...values, sortOrder: await nextSortOrder(db, services) });
		else await db.update(services).set(values).where(eq(services.id, id));
		await runBatch(db, [
			db.delete(serviceLocations).where(eq(serviceLocations.serviceId, id)),
			...[...new Set(d.locationIds)].map((locationId) => db.insert(serviceLocations).values({ serviceId: id, locationId })),
			db.delete(serviceDoctors).where(eq(serviceDoctors.serviceId, id)),
			...[...new Set(d.doctorIds)].map((doctorId) => db.insert(serviceDoctors).values({ serviceId: id, doctorId }))
		]);
		await contentChanged(event, isNew ? 'create' : 'update', 'service', id, d.name);
		if (isNew) redirect(303, `/admin/services/${id}?created=1`);
		return { ok: true };
	}
};
