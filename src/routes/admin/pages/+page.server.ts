import { desc, asc } from 'drizzle-orm';
import { pages } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { deleteAction, toggleAction } from '#lib/server/crud.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'content:write');
	const rows = await event.locals.db
		.select({ id: pages.id, kind: pages.kind, slug: pages.slug, title: pages.title, published: pages.published, publishedAt: pages.publishedAt, updatedAt: pages.updatedAt, showInFooter: pages.showInFooter })
		.from(pages)
		.orderBy(asc(pages.kind), desc(pages.publishedAt), asc(pages.title));
	return { title: 'Pages & blog', items: rows.map((r) => ({ ...r, active: r.published })) };
};

export const actions: Actions = {
	toggle: (e) => toggleAction(e, pages, 'page', 'published'),
	delete: (e) => deleteAction(e, pages, 'page', (r) => r.title)
};
