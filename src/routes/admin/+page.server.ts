import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { requirePermission } from '#lib/server/auth.js';
import { appointments, locations, doctors, services, slides, certifications } from '#lib/server/db/schema.js';
import { can, locationScope } from '#lib/permissions.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const db = event.locals.db;
	const count = async (table: typeof locations | typeof doctors | typeof services | typeof slides | typeof certifications) =>
		(await db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0;

	let newRequests: Array<{
		id: string;
		reference: string;
		patientName: string;
		phone: string;
		preferredDate: string;
		timeWindow: string;
		createdAt: number;
		locationName: string | null;
	}> = [];
	let newCount = 0;
	if (can(user, 'appointments:read')) {
		const scope = locationScope(user);
		const where = and(
			eq(appointments.status, 'new'),
			scope ? (scope.length ? inArray(appointments.locationId, scope) : sql`0`) : undefined
		);
		newRequests = await db
			.select({
				id: appointments.id,
				reference: appointments.reference,
				patientName: appointments.patientName,
				phone: appointments.phone,
				preferredDate: appointments.preferredDate,
				timeWindow: appointments.timeWindow,
				createdAt: appointments.createdAt,
				locationName: locations.name
			})
			.from(appointments)
			.leftJoin(locations, eq(locations.id, appointments.locationId))
			.where(where)
			.orderBy(desc(appointments.createdAt))
			.limit(8);
		newCount = (await db.select({ n: sql<number>`COUNT(*)` }).from(appointments).where(where).get())?.n ?? 0;
	}

	return {
		title: 'Dashboard',
		counts: {
			locations: await count(locations),
			doctors: await count(doctors),
			services: await count(services),
			slides: await count(slides),
			certifications: await count(certifications)
		},
		newRequests,
		newCount
	};
};
