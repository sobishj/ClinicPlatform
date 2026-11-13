import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { certifications } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction, nextSortOrder, optionalImage } from '#lib/server/crud.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { can } from '#lib/permissions.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	id: z.string().optional(),
	title: z.string().trim().min(2, 'Enter a title').max(160),
	issuer: z.string().trim().max(160).nullable().default(null),
	year: z.number().int().min(1900).max(2100).nullable().default(null),
	image: optionalImage,
	description: z.string().trim().max(1000).nullable().default(null),
	pdfUrl: z
		.string()
		.trim()
		.max(500)
		.refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), 'Invalid link')
		.nullable()
		.default(null),
	active: z.boolean().default(true)
});

export const load: PageServerLoad = async (event) => {
	const user = requirePermission(event, 'content:read');
	const items = await event.locals.db.select().from(certifications).orderBy(asc(certifications.sortOrder));
	return { title: 'Certifications', items, canWrite: can(user, 'content:write') };
};

export const actions: Actions = {
	save: async (event) => {
		requirePermission(event, 'content:write');
		const parsed = await parsePayload(event.request, schema);
		if (!parsed.ok) return parsed.failure;
		const { id, ...d } = parsed.data;
		const db = event.locals.db;
		const values = { ...d, pdfUrl: d.pdfUrl || null };
		if (id) await db.update(certifications).set(values).where(eq(certifications.id, id));
		else await db.insert(certifications).values({ ...values, sortOrder: await nextSortOrder(db, certifications) });
		await contentChanged(event, id ? 'update' : 'create', 'certification', id ?? null, d.title);
		return { ok: true };
	},
	reorder: (e) => reorderAction(e, certifications, 'certification'),
	toggle: (e) => toggleAction(e, certifications, 'certification'),
	delete: (e) => deleteAction(e, certifications, 'certification', (r) => r.title)
};
