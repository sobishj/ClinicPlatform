import type { RequestEvent } from '@sveltejs/kit';
import { ApiError } from './auth.js';

export async function readJson(event: RequestEvent): Promise<unknown> {
	if (!(event.request.headers.get('content-type') ?? '').includes('application/json'))
		throw new ApiError(415, 'unsupported_media_type', 'Send a JSON body with Content-Type: application/json.');
	try {
		return await event.request.json();
	} catch {
		throw new ApiError(400, 'invalid_json', 'The request body is not valid JSON.');
	}
}

