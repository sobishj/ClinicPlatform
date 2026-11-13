import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { media } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { listMedia, mediaUsage } from '#lib/server/media.js';
import { getStorage } from '#lib/server/platform.js';
import { parsePayload, failMessage } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'media:write');
	const q = event.url.searchParams.get('q')?.trim() || undefined;
	const page = Number(event.url.searchParams.get('page')) || 1;
	return { title: 'Media library', q: q ?? '', ...(await listMedia(event.locals.db, { q, page, kind: 'all', perPage: 60 })) };
};

export const actions: Actions = {
	alt: async (event) => {
		requirePermission(event, 'media:write');
		const parsed = await parsePayload(event.request, z.object({ id: z.string(), alt: z.string().trim().min(1, 'Alt text is required').max(300) }));
		if (!parsed.ok) return parsed.failure;
		await event.locals.db.update(media).set({ alt: parsed.data.alt }).where(eq(media.id, parsed.data.id));
		return { ok: true };
	},
	usage: async (event) => {
		requirePermission(event, 'media:write');
		const id = String((await event.request.formData()).get('id') ?? '');
		const row = await event.locals.db.select().from(media).where(eq(media.id, id)).get();
		if (!row) return failMessage('Not found', 404);
		return { ok: true, usedIn: await mediaUsage(event.locals.db, row.url) };
	},
	delete: async (event) => {
		requirePermission(event, 'media:write');
		const id = String((await event.request.formData()).get('id') ?? '');
		const db = event.locals.db;
		const row = await db.select().from(media).where(eq(media.id, id)).get();
		if (!row) return failMessage('Not found', 404);
		const usedIn = await mediaUsage(db, row.url);
		if (usedIn.length) return failMessage(`This file is still used in: ${usedIn.join(', ')}. Replace it there first.`);
		if (row.key.startsWith('uploads/')) await getStorage(event.platform).delete(row.key);
		await db.delete(media).where(eq(media.id, id));
		await audit(event, 'delete', 'media', id, row.filename ?? row.key);
		return { ok: true };
	}
};
