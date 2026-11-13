import { desc, like, or, sql, eq } from 'drizzle-orm';
import type { DB } from './db/index.js';
import { media } from './db/schema.js';
import { UPLOAD_TYPES, MAX_UPLOAD_BYTES, type Storage } from './storage/types.js';
import { mediaUrl } from './platform.js';

/** Detect the real file type from magic bytes (never trust the browser's MIME type). */
export function sniffMime(bytes: Uint8Array): string | null {
	const b = bytes;
	const ascii = (start: number, len: number) => String.fromCharCode(...b.slice(start, start + len));
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
	if (b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png';
	if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
	if (ascii(0, 4) === 'GIF8') return 'image/gif';
	if (ascii(0, 4) === '%PDF') return 'application/pdf';
	if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon';
	if (ascii(4, 4) === 'ftyp' && /avif|avis/.test(ascii(8, 4))) return 'image/avif';
	return null;
}

export class UploadError extends Error {}

export async function storeUpload(
	db: DB,
	storage: Storage,
	file: File,
	meta: { alt: string; width?: number | null; height?: number | null; folder?: string | null }
) {
	if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('File is larger than 8 MB.');
	const bytes = new Uint8Array(await file.arrayBuffer());
	const mime = sniffMime(bytes);
	if (!mime || !UPLOAD_TYPES[mime]) throw new UploadError('Only JPEG, PNG, WebP, AVIF, GIF, ICO and PDF files are allowed.');
	const alt = meta.alt.trim();
	if (!alt && mime !== 'application/pdf') throw new UploadError('Alt text is required for images.');
	const now = new Date();
	const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${UPLOAD_TYPES[mime]}`;
	await storage.put(key, bytes, mime);
	const row = {
		id: crypto.randomUUID(),
		key,
		url: mediaUrl(key),
		alt: alt || file.name,
		filename: file.name.slice(0, 200),
		mime,
		size: bytes.byteLength,
		width: meta.width ?? null,
		height: meta.height ?? null,
		folder: meta.folder ?? null
	};
	await db.insert(media).values(row);
	return row;
}

export async function listMedia(db: DB, opts: { q?: string; page?: number; perPage?: number; kind?: 'image' | 'pdf' | 'all' }) {
	const perPage = opts.perPage ?? 48;
	const page = Math.max(1, opts.page ?? 1);
	const conds = [];
	if (opts.q) conds.push(or(like(media.alt, `%${opts.q}%`), like(media.filename, `%${opts.q}%`)));
	if (opts.kind === 'image') conds.push(like(media.mime, 'image/%'));
	if (opts.kind === 'pdf') conds.push(eq(media.mime, 'application/pdf'));
	const where = conds.length ? sql.join(conds.map((c) => sql`(${c})`), sql` AND `) : undefined;
	const rows = await db
		.select()
		.from(media)
		.where(where)
		.orderBy(desc(media.createdAt))
		.limit(perPage + 1)
		.offset((page - 1) * perPage);
	return { items: rows.slice(0, perPage), hasMore: rows.length > perPage, page };
}

/** Tables/columns that may reference media URLs (JSON or text). */
const REFERENCE_COLUMNS: Array<[string, string]> = [
	['settings', 'value'],
	['locations', 'photos'],
	['doctors', 'photo'],
	['doctors', 'photo_portrait'],
	['doctors', 'bio'],
	['services', 'image'],
	['services', 'content'],
	['certifications', 'image'],
	['certifications', 'pdf_url'],
	['slides', 'image'],
	['slides', 'mobile_image'],
	['blocks', 'data'],
	['pages', 'cover_image'],
	['pages', 'content']
];

/** Where is this URL used? Returns table names (empty array = unused). */
export async function mediaUsage(db: DB, url: string): Promise<string[]> {
	const used: string[] = [];
	for (const [table, col] of REFERENCE_COLUMNS) {
		const row = await db.get<{ n: number }>(
			sql`SELECT COUNT(*) AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(col)} LIKE ${'%' + url + '%'}`
		);
		if (row && row.n > 0 && !used.includes(table)) used.push(table);
	}
	return used;
}
