/**
 * Browser-side image processing: resize/crop and re-encode to WebP before upload,
 * so the server (and Cloudflare Workers) never has to process images.
 */

export interface CropRect {
	sx: number;
	sy: number;
	sw: number;
	sh: number;
}

export interface ProcessedImage {
	blob: Blob;
	width: number;
	height: number;
	type: string;
}

const PASSTHROUGH = new Set(['image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf']);

export function needsProcessing(file: File): boolean {
	return file.type.startsWith('image/') && !PASSTHROUGH.has(file.type) && file.type !== 'image/svg+xml';
}

export async function loadBitmap(file: Blob): Promise<ImageBitmap> {
	return createImageBitmap(file);
}

/**
 * Resize (keeping aspect) to fit maxWidth × maxHeight, optionally cropping first, and encode as WebP
 * (falls back to JPEG on browsers that cannot encode WebP).
 */
export async function processImage(
	file: Blob,
	opts: { maxWidth: number; maxHeight?: number; quality?: number; crop?: CropRect }
): Promise<ProcessedImage> {
	const bitmap = await loadBitmap(file);
	const crop = opts.crop ?? { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };
	const maxH = opts.maxHeight ?? Infinity;
	const scale = Math.min(1, opts.maxWidth / crop.sw, maxH / crop.sh);
	const width = Math.max(1, Math.round(crop.sw * scale));
	const height = Math.max(1, Math.round(crop.sh * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not supported in this browser.');
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
	bitmap.close();

	const quality = opts.quality ?? 0.82;
	let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
	if (!blob || blob.type !== 'image/webp') {
		blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
	}
	if (!blob) throw new Error('Could not encode the image.');
	return { blob, width, height, type: blob.type };
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface UploadedMedia {
	id: string;
	url: string;
	alt: string;
	width: number | null;
	height: number | null;
	mime: string;
	size: number;
}

/** Upload a (processed) file to the media library. */
export async function uploadMedia(
	blob: Blob,
	meta: { alt: string; filename: string; width?: number; height?: number; folder?: string }
): Promise<UploadedMedia> {
	const fd = new FormData();
	fd.set('file', blob, meta.filename);
	fd.set('alt', meta.alt);
	if (meta.width) fd.set('width', String(meta.width));
	if (meta.height) fd.set('height', String(meta.height));
	if (meta.folder) fd.set('folder', meta.folder);
	const res = await fetch('/admin/media/upload', { method: 'POST', body: fd });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.message ?? `Upload failed (${res.status})`);
	return body as UploadedMedia;
}
