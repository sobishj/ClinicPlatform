import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { slides } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction, nextSortOrder, imageRefSchema, optionalImage } from '#lib/server/crud.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	id: z.string().optional(),
	image: imageRefSchema,
	mobileImage: optionalImage,
	heading: z.string().trim().max(120).nullable().default(null),
	subheading: z.string().trim().max(300).nullable().default(null),
	buttonText: z.string().trim().max(40).nullable().default(null),
	buttonLink: z
		.string()
		.trim()
		.max(300)
		.refine((v) => v === '' || /^(\/|#|https:\/\/|tel:)/.test(v), 'Link must start with /, https:// or tel:')
		.nullable()
		.default(null),
	align: z.enum(['left', 'center', 'right']).default('left'),
	overlay: z.number().int().min(0).max(90).default(35),
	active: z.boolean().default(true)
});

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'content:write');
	const items = await event.locals.db.select().from(slides).orderBy(asc(slides.sortOrder));
	return { title: 'Hero slides', items, ...loadGroups(event, ['hero']) };
};

export const actions: Actions = {
	save: async (event) => {
		requirePermission(event, 'content:write');
		const parsed = await parsePayload(event.request, schema);
		if (!parsed.ok) return parsed.failure;
		const { id, ...d } = parsed.data;
		const db = event.locals.db;
		if (id) await db.update(slides).set(d).where(eq(slides.id, id));
		else await db.insert(slides).values({ ...d, sortOrder: await nextSortOrder(db, slides) });
		await contentChanged(event, id ? 'update' : 'create', 'slide', id ?? null, d.heading ?? d.image.alt);
		return { ok: true };
	},
	settings: (event) => saveGroups(event, ['hero']),
	reorder: (e) => reorderAction(e, slides, 'slide'),
	toggle: (e) => toggleAction(e, slides, 'slide'),
	delete: (e) => deleteAction(e, slides, 'slide', (r) => r.heading ?? '')
};
