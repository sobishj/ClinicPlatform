import { error, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { locations, locationClosures, services, serviceLocations } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { sanitizeHtml } from '#lib/server/sanitize.js';
import { runBatch } from '#lib/server/db/index.js';
import {
	uniqueSlug,
	nextSortOrder,
	imageRefSchema,
	slugSchema,
	seoSchema,
	weeklyHoursSchema,
	dateRangeSchema
} from '#lib/server/crud.js';
import { isAllowedEmbedUrl } from '#lib/maps.js';
import { can } from '#lib/permissions.js';
import { emitEvent } from '#lib/server/integrations/events.js';
import type { Actions, PageServerLoad } from './$types';

const optionalUrl = z
	.string()
	.trim()
	.max(2000)
	.refine((v) => v === '' || /^https:\/\//.test(v), 'Must start with https://')
	.nullable()
	.default(null);

const schema = z.object({
	name: z.string().trim().min(2, 'Enter a name').max(100),
	slug: slugSchema,
	type: z.string().trim().min(1).max(40),
	parentId: z.string().nullable().default(null),
	addressLine1: z.string().trim().min(3, 'Enter the address').max(200),
	addressLine2: z.string().trim().max(200).nullable().default(null),
	area: z.string().trim().max(100).nullable().default(null),
	city: z.string().trim().min(2, 'Enter the city').max(100),
	state: z.string().trim().max(100).nullable().default(null),
	postalCode: z.string().trim().max(12).nullable().default(null),
	phones: z.array(z.string().trim().min(5).max(40)).max(5).default([]),
	whatsapp: z.string().trim().max(40).nullable().default(null),
	email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).nullable().default(null),
	notificationEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).nullable().default(null),
	mapEmbedUrl: z
		.string()
		.nullable()
		.default(null)
		.refine((v) => !v || isAllowedEmbedUrl(v), 'Only Google Maps embed links are allowed'),
	directionsUrl: optionalUrl,
	latitude: z.number().min(-90).max(90).nullable().default(null),
	longitude: z.number().min(-180).max(180).nullable().default(null),
	hours: weeklyHoursSchema,
	closures: z.array(dateRangeSchema).max(100).default([]),
	photos: z.array(imageRefSchema).max(20).default([]),
	summary: z.string().trim().max(300).nullable().default(null),
	description: z.string().max(20000).nullable().default(null),
	serviceIds: z.array(z.string()).default([]),
	bookingMode: z.enum(['inherit', 'request', 'slots']).default('inherit'),
	active: z.boolean().default(true),
	seo: seoSchema
});

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const db = event.locals.db;
	const id = event.params.id;
	const [allServices, allLocations] = await Promise.all([
		db.select({ id: services.id, name: services.name, category: services.category }).from(services).orderBy(asc(services.sortOrder)),
		db.select({ id: locations.id, name: locations.name }).from(locations).orderBy(asc(locations.sortOrder))
	]);
	const base = {
		services: allServices,
		parents: allLocations.filter((l) => l.id !== id),
		types: event.locals.settings.locationTypes.types,
		canWrite: can(user, 'content:write')
	};
	if (id === 'new') {
		return {
			...base,
			title: `New ${event.locals.settings.labels.location.toLowerCase()}`,
			isNew: true,
			location: {
				name: '',
				slug: '',
				type: event.locals.settings.locationTypes.types.includes('Branch') ? 'Branch' : (event.locals.settings.locationTypes.types[0] ?? 'Branch'),
				parentId: null,
				addressLine1: '',
				addressLine2: null,
				area: null,
				city: '',
				state: null,
				postalCode: null,
				phones: [] as string[],
				whatsapp: null,
				email: null,
				notificationEmail: null,
				mapEmbedUrl: null,
				directionsUrl: null,
				latitude: null,
				longitude: null,
				hours: {},
				closures: [] as Array<{ startDate: string; endDate: string; reason: string }>,
				photos: [],
				summary: null,
				description: null,
				serviceIds: allServices.map((s) => s.id),
				bookingMode: 'inherit',
				active: true,
				seo: null
			}
		};
	}
	const row = await db.select().from(locations).where(eq(locations.id, id)).get();
	if (!row) error(404, { message: 'Location not found' });
	const [closures, svc] = await Promise.all([
		db.select().from(locationClosures).where(eq(locationClosures.locationId, id)).orderBy(asc(locationClosures.startDate)),
		db.select({ serviceId: serviceLocations.serviceId }).from(serviceLocations).where(eq(serviceLocations.locationId, id))
	]);
	return {
		...base,
		title: row.name,
		isNew: false,
		location: {
			...row,
			closures: closures.map((c) => ({ startDate: c.startDate, endDate: c.endDate, reason: c.reason ?? '' })),
			serviceIds: svc.map((s) => s.serviceId)
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
		const slug = await uniqueSlug(db, locations, d.slug || d.name, isNew ? undefined : id);
		const values = {
			name: d.name,
			slug,
			type: d.type,
			parentId: d.parentId || null,
			addressLine1: d.addressLine1,
			addressLine2: d.addressLine2 || null,
			area: d.area || null,
			city: d.city,
			state: d.state || null,
			postalCode: d.postalCode || null,
			phones: d.phones.filter(Boolean),
			whatsapp: d.whatsapp || null,
			email: d.email || null,
			notificationEmail: d.notificationEmail || null,
			mapEmbedUrl: d.mapEmbedUrl || null,
			directionsUrl: d.directionsUrl || null,
			latitude: d.latitude,
			longitude: d.longitude,
			hours: d.hours,
			photos: d.photos,
			summary: d.summary || null,
			description: sanitizeHtml(d.description),
			bookingMode: d.bookingMode,
			active: d.active,
			seo: d.seo
		};
		if (isNew) {
			await db.insert(locations).values({ id, ...values, sortOrder: await nextSortOrder(db, locations) });
		} else {
			await db.update(locations).set(values).where(eq(locations.id, id));
		}
		await runBatch(db, [
			db.delete(locationClosures).where(eq(locationClosures.locationId, id)),
			...d.closures.map((c) => db.insert(locationClosures).values({ locationId: id, ...c })),
			db.delete(serviceLocations).where(eq(serviceLocations.locationId, id)),
			...d.serviceIds.map((serviceId) => db.insert(serviceLocations).values({ serviceId, locationId: id }))
		]);
		await contentChanged(event, isNew ? 'create' : 'update', 'location', id, d.name);
		await emitEvent(event, 'location.updated', { id, slug, name: d.name, active: d.active });
		if (isNew) redirect(303, `/admin/locations/${id}?created=1`);
		return { ok: true };
	}
};
