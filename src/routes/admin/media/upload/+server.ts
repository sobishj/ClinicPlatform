import { json, error } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth.js';
import { getStorage } from '#lib/server/platform.js';
import { storeUpload, UploadError } from '#lib/server/media.js';
import { audit } from '#lib/server/audit.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	requirePermission(event, 'media:write');
	const form = await event.request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file received.');
	try {
		const row = await storeUpload(
			event.locals.db,
			getStorage(event.platform, { id: event.locals.tenant!.id, db: event.locals.db }),
			file,
			{
				alt: String(form.get('alt') ?? ''),
				width: Number(form.get('width')) || null,
				height: Number(form.get('height')) || null,
				folder: String(form.get('folder') ?? '') || null
			}
		);
		await audit(event, 'create', 'media', row.id, row.filename ?? row.key);
		return json(row, { status: 201 });
	} catch (err) {
		if (err instanceof UploadError) error(400, err.message);
		throw err;
	}
};
