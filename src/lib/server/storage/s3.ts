import { AwsClient } from 'aws4fetch';
import { type Storage, mimeFromKey } from './types.js';

export interface S3Config {
	endpoint: string; // e.g. https://<account>.r2.cloudflarestorage.com or https://s3.eu-west-1.amazonaws.com
	region?: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
}

/** Any S3-compatible bucket (AWS S3, MinIO, Backblaze B2, Wasabi…) for the Node build. Uses fetch only. */
export function s3Storage(cfg: S3Config): Storage {
	const client = new AwsClient({
		accessKeyId: cfg.accessKeyId,
		secretAccessKey: cfg.secretAccessKey,
		region: cfg.region ?? 'auto',
		service: 's3'
	});
	const base = `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}`;
	const url = (key: string) => `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;

	return {
		driver: 's3',
		async put(key, data, contentType) {
			const res = await client.fetch(url(key), {
				method: 'PUT',
				body: data as unknown as BodyInit,
				headers: { 'content-type': contentType }
			});
			if (!res.ok) throw new Error(`S3 put failed: ${res.status} ${await res.text()}`);
		},
		async get(key) {
			const res = await client.fetch(url(key));
			if (res.status === 404) return null;
			if (!res.ok || !res.body) throw new Error(`S3 get failed: ${res.status}`);
			return {
				body: res.body,
				contentType: res.headers.get('content-type') ?? mimeFromKey(key),
				size: Number(res.headers.get('content-length') ?? 0) || undefined,
				etag: res.headers.get('etag') ?? undefined
			};
		},
		async delete(key) {
			await client.fetch(url(key), { method: 'DELETE' });
		},
		async list(prefix = '') {
			const keys: string[] = [];
			let token: string | undefined;
			do {
				const q = new URLSearchParams({ 'list-type': '2', prefix });
				if (token) q.set('continuation-token', token);
				const res = await client.fetch(`${base}?${q}`);
				const xml = await res.text();
				for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
				token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
					? /<NextContinuationToken>([^<]+)</.exec(xml)?.[1]
					: undefined;
			} while (token);
			return keys;
		}
	};
}
