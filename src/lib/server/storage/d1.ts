/**
 * File storage inside the D1 database (Cloudflare free tier, no R2 needed).
 * Files are split into CHUNK_BYTES pieces in the `media_chunks` table; see schema.ts.
 * Uploads are resized/compressed in the browser first, so most images are 50–300 KB.
 */
import { sql } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import type { Storage } from './types.js';

/** 40 KB keeps each row tiny and each copy statement (hex-encoded) under D1's 100 KB limit. */
export const CHUNK_BYTES = 40 * 1024;

/** D1 returns BLOBs as ArrayBuffer (or, in older runtimes, an array of numbers). */
function toBytes(v: unknown): Uint8Array {
	if (v instanceof Uint8Array) return v;
	if (v instanceof ArrayBuffer) return new Uint8Array(v);
	if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
	if (Array.isArray(v)) return Uint8Array.from(v as number[]);
	throw new Error('Unexpected BLOB value from the database');
}

export function d1Storage(db: DB): Storage {
	return {
		driver: 'd1',
		async put(key, data, contentType) {
			const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
			await db.run(sql`DELETE FROM media_chunks WHERE key = ${key}`);
			try {
				for (let i = 0, idx = 0; i < bytes.byteLength || idx === 0; i += CHUNK_BYTES, idx++) {
					const chunk = bytes.slice(i, i + CHUNK_BYTES);
					await db.run(sql`INSERT INTO media_chunks (key, idx, mime, data) VALUES (${key}, ${idx}, ${contentType}, ${chunk})`);
				}
			} catch (err) {
				// Don't leave a half-written file behind.
				await db.run(sql`DELETE FROM media_chunks WHERE key = ${key}`).catch(() => {});
				throw err;
			}
		},
		async get(key) {
			const rows = await db.all<{ mime: string; data: unknown }>(sql`SELECT mime, data FROM media_chunks WHERE key = ${key} ORDER BY idx`);
			if (!rows.length) return null;
			const parts = rows.map((r) => toBytes(r.data));
			const size = parts.reduce((n, p) => n + p.byteLength, 0);
			const body = new Uint8Array(size);
			let offset = 0;
			for (const p of parts) {
				body.set(p, offset);
				offset += p.byteLength;
			}
			return { body, contentType: rows[0].mime, size, etag: `"${key.split('/').pop()?.split('.')[0] ?? key}"` };
		},
		async delete(key) {
			await db.run(sql`DELETE FROM media_chunks WHERE key = ${key}`);
		},
		async list(prefix = '') {
			const rows = await db.all<{ key: string }>(sql`SELECT DISTINCT key FROM media_chunks WHERE key LIKE ${prefix + '%'} ORDER BY key`);
			return rows.map((r) => r.key);
		}
	};
}
