import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { pages } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { sanitizeHtml } from '#lib/server/sanitize.js';
import { uniqueSlug, optionalImage, slugSchema, seoSchema } from '#lib/server/crud.js';
import type { Actions, PageServerLoad } from './$types';

/** Top-level paths used by the site itself; custom pages cannot take them. */
const RESERVED_SLUGS = new Set([
	'admin', 'api', 'media', 'book', 'services', 'doctors', 'locations', 'certifications', 'contact',
	'gallery', 'blog', 'sitemap', 'robots', 'demo', 'favicon', '_app'
]);

const schema = z.object({
	kind: z.enum(['page', 'post']),
	title: z.string().trim().min(2, 'Enter a title').max(160),
	slug: slugSchema,
	excerpt: z.string().trim().max(400).nullable().default(null),
	content: z.string().max(100000).nullable().default(null),
	coverImage: optionalImage,
	published: z.boolean().default(true),
	publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
	showInFooter: z.boolean().default(false),
	seo: seoSchema
});

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'content:write');
	const id = event.params.id;
	if (id === 'new') {
		const kind = event.url.searchParams.get('kind') === 'post' ? 'post' : 'page';
		return {
			title: kind === 'post' ? 'New article' : 'New page',
			isNew: true,
			page: { kind, title: '', slug: '', excerpt: '', content: '', coverImage: null, published: kind === 'page', publishedAt: new Date().toISOString().slice(0, 10), showInFooter: false, seo: null }
		};
	}
	const row = await event.locals.db.select().from(pages).where(eq(pages.id, id)).get();
	if (!row) error(404, { message: 'Not found' });
	return {
		title: row.title,
		isNew: false,
		page: { ...row, excerpt: row.excerpt ?? '', content: row.content ?? '', publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString().slice(0, 10) : null }
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
		const slug = await uniqueSlug(db, pages, d.slug || d.title, isNew ? undefined : id, eq(pages.kind, d.kind));
		if (d.kind === 'page' && RESERVED_SLUGS.has(slug)) {
			return fail(400, { errors: { slug: 'This address is used by the website. Choose another.' }, message: 'Choose another URL.' });
		}
		const values = {
			kind: d.kind,
			title: d.title,
			slug,
			excerpt: d.excerpt || null,
			content: sanitizeHtml(d.content),
			coverImage: d.coverImage,
			published: d.published,
			publishedAt: d.publishedAt ? Date.parse(d.publishedAt + 'T00:00:00Z') : d.published ? Date.now() : null,
			showInFooter: d.showInFooter,
			seo: d.seo
		};
		if (isNew) await db.insert(pages).values({ id, ...values });
		else await db.update(pages).set(values).where(eq(pages.id, id));
		await contentChanged(event, isNew ? 'create' : 'update', 'page', id, d.title);
		if (isNew) redirect(303, `/admin/pages/${id}`);
		return { ok: true };
	}
};
