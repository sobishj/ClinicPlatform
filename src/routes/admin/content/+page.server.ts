import { sql } from 'drizzle-orm';
import { blocks } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { COLLECTIONS } from '#lib/content/collections.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'content:write');
	const counts = await event.locals.db
		.select({ collection: blocks.collection, n: sql<number>`COUNT(*)` })
		.from(blocks)
		.groupBy(blocks.collection);
	const byKey = new Map(counts.map((c) => [c.collection, c.n]));
	return {
		title: 'Content blocks',
		collections: Object.values(COLLECTIONS).map((c) => ({
			key: c.key,
			label: c.label,
			description: c.description,
			module: 'module' in c ? c.module : undefined,
			count: byKey.get(c.key) ?? 0
		}))
	};
};
