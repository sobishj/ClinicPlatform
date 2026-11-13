import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { blocks } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { reorderAction, toggleAction, deleteAction, nextSortOrder } from '#lib/server/crud.js';
import { parsePayload } from '#lib/server/forms.js';
import { contentChanged } from '#lib/server/audit.js';
import { sanitizeHtml } from '#lib/server/sanitize.js';
import { COLLECTIONS, collectionSchema, isCollectionKey, type CollectionDef } from '#lib/content/collections.js';
import type { Actions, PageServerLoad } from './$types';

function getDef(key: string): CollectionDef {
	if (!isCollectionKey(key)) error(404, 'Unknown content type');
	return COLLECTIONS[key];
}

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'content:write');
	const def = getDef(event.params.collection);
	const items = await event.locals.db
		.select()
		.from(blocks)
		.where(eq(blocks.collection, def.key))
		.orderBy(asc(blocks.sortOrder));
	return { title: def.label, def, items };
};

export const actions: Actions = {
	save: async (event) => {
		requirePermission(event, 'content:write');
		const def = getDef(event.params.collection);
		if (!isCollectionKey(def.key)) error(404);
		const parsed = await parsePayload(event.request, z.object({ id: z.string().optional(), active: z.boolean().default(true), data: collectionSchema(def.key) }));
		if (!parsed.ok) return parsed.failure;
		const { id, active } = parsed.data;
		const data = parsed.data.data as Record<string, unknown>;
		for (const f of def.fields) if (f.type === 'richtext') data[f.name] = sanitizeHtml(String(data[f.name] ?? ''));
		const db = event.locals.db;
		if (id) {
			await db.update(blocks).set({ data, active }).where(and(eq(blocks.id, id), eq(blocks.collection, def.key)));
		} else {
			await db.insert(blocks).values({ collection: def.key, data, active, sortOrder: await nextSortOrder(db, blocks, eq(blocks.collection, def.key)) });
		}
		await contentChanged(event, id ? 'update' : 'create', 'block', id ?? null, `${def.singular}: ${String(data[def.titleField] ?? '')}`);
		return { ok: true };
	},
	reorder: (e) => reorderAction(e, blocks, 'block'),
	toggle: (e) => toggleAction(e, blocks, 'block'),
	delete: (e) => deleteAction(e, blocks, 'block', (r) => `${r.collection}: ${String(r.data?.title ?? r.data?.name ?? r.data?.question ?? '')}`)
};
