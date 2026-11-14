import { error } from '@sveltejs/kit';
import { getStorage, cacheGet, cachePut, TARGET } from '#lib/server/platform.js';
import type { RequestHandler } from './$types';

const ONE_YEAR = 31536000;

/**
 * Serves uploaded files (D1 on Cloudflare, disk/S3 on a server). Keys are unique per
 * upload, so responses are immutable and cached for a year. On Cloudflare they are also
 * kept in the edge cache, so each file is read from D1 only occasionally.
 */
export const GET: RequestHandler = async ({ params, platform, request, locals }) => {
	const key = params.key;
	if (!key || key.includes('..') || !key.startsWith('uploads/')) error(404, 'Not found');

	if (!locals.tenant) error(404, 'Not found');
	// Keys are only unique within a client, so the cache key includes the client.
	const cacheKey = `/${locals.tenant.id}/media/${key}`;
	if (TARGET === 'cloudflare') {
		const hit = await cacheGet(platform, cacheKey);
		if (hit) return hit;
	}

	const obj = await getStorage(platform, { id: locals.tenant.id, db: locals.db }).get(key);
	if (!obj) error(404, 'Not found');
	if (obj.etag && request.headers.get('if-none-match') === obj.etag) {
		return new Response(null, { status: 304 });
	}
	const headers = new Headers({
		'content-type': obj.contentType,
		'cache-control': `public, max-age=${ONE_YEAR}, immutable`,
		'x-content-type-options': 'nosniff'
	});
	if (obj.size) headers.set('content-length', String(obj.size));
	if (obj.etag) headers.set('etag', obj.etag);
	if (obj.contentType === 'application/pdf') headers.set('content-disposition', 'inline');
	const response = new Response(obj.body as unknown as BodyInit, { headers });

	if (TARGET === 'cloudflare')
		await cachePut(platform, cacheKey, response.clone(), ONE_YEAR).catch(() => {});
	return response;
};
