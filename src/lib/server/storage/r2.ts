import type { Storage } from './types.js';

/** Cloudflare R2 binding storage. */
export function r2Storage(bucket: R2Bucket): Storage {
	return {
		driver: 'r2',
		async put(key, data, contentType) {
			await bucket.put(key, data, {
				httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' }
			});
		},
		async get(key) {
			const obj = await bucket.get(key);
			if (!obj) return null;
			return {
				body: obj.body as unknown as ReadableStream,
				contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
				size: obj.size,
				etag: obj.httpEtag
			};
		},
		async delete(key) {
			await bucket.delete(key);
		},
		async list(prefix) {
			const keys: string[] = [];
			let cursor: string | undefined;
			do {
				const res = await bucket.list({ prefix, cursor });
				keys.push(...res.objects.map((o) => o.key));
				cursor = res.truncated ? res.cursor : undefined;
			} while (cursor);
			return keys;
		}
	};
}
