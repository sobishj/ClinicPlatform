import { error } from '@sveltejs/kit';
import { getStorage } from '#lib/server/platform.js';
import type { RequestHandler } from './$types';

/** Serves uploaded files from R2 / disk / S3. Keys are content-unique, so cache forever. */
export const GET: RequestHandler = async ({ params, platform, request }) => {
	const key = params.key;
	if (!key || key.includes('..') || !key.startsWith('uploads/')) error(404, { message: 'Not found' });
	const obj = await getStorage(platform).get(key);
	if (!obj) error(404, { message: 'Not found' });
	if (obj.etag && request.headers.get('if-none-match') === obj.etag) {
		return new Response(null, { status: 304 });
	}
	const headers = new Headers({
		'content-type': obj.contentType,
		'cache-control': 'public, max-age=31536000, immutable',
		'x-content-type-options': 'nosniff'
	});
	if (obj.size) headers.set('content-length', String(obj.size));
	if (obj.etag) headers.set('etag', obj.etag);
	if (obj.contentType === 'application/pdf') headers.set('content-disposition', 'inline');
	return new Response(obj.body as unknown as BodyInit, { headers });
};
