import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth.js';
import { listMedia } from '#lib/server/media.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requirePermission(event, 'content:read');
	const q = event.url.searchParams.get('q')?.trim() || undefined;
	const page = Number(event.url.searchParams.get('page')) || 1;
	const kind = (event.url.searchParams.get('kind') as 'image' | 'pdf' | 'all' | null) ?? 'image';
	return json(await listMedia(event.locals.db, { q, page, kind }));
};
