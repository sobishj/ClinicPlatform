export interface StoredObject {
	body: ReadableStream | Uint8Array | ArrayBuffer;
	contentType: string;
	size?: number;
	etag?: string;
}

/** File storage for uploads. Implementations: R2, local disk, S3-compatible. */
export interface Storage {
	readonly driver: 'r2' | 'local' | 's3' | 'none';
	put(key: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<StoredObject | null>;
	delete(key: string): Promise<void>;
	/** Returns all keys (used by backup/migration tooling). */
	list?(prefix?: string): Promise<string[]>;
}

export const MIME_BY_EXT: Record<string, string> = {
	webp: 'image/webp',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	avif: 'image/avif',
	ico: 'image/x-icon',
	pdf: 'application/pdf'
};

export function mimeFromKey(key: string): string {
	const ext = key.split('.').pop()?.toLowerCase() ?? '';
	return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/** Allowed upload types. SVG is excluded for uploads (script risk); seeded SVGs are served from /static. */
export const UPLOAD_TYPES: Record<string, string> = {
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/avif': 'avif',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
	'application/pdf': 'pdf'
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const nullStorage: Storage = {
	driver: 'none',
	async put() {
		throw new Error('No file storage is configured.');
	},
	async get() {
		return null;
	},
	async delete() {}
};
