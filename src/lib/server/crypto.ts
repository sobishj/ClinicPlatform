/** Web Crypto helpers — identical on Workers, Node 20+ and in CLI scripts. */

const enc = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): Uint8Array {
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

export function toHex(buf: ArrayBuffer | Uint8Array): string {
	return [...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))]
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function randomToken(bytes = 32): string {
	return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(input: string): Promise<string> {
	return toHex(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

// ───────── passwords (PBKDF2-SHA256) ─────────

/** Cloudflare Workers caps PBKDF2 at 100 000 iterations. */
const ITERATIONS = 100_000;
const KEY_BITS = 256;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
		key,
		KEY_BITS
	);
	return new Uint8Array(bits);
}

/** Format: pbkdf2-sha256$<iterations>$<salt b64url>$<hash b64url> */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await derive(password, salt, ITERATIONS);
	return `pbkdf2-sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, iter, saltB64, hashB64] = stored.split('$');
	if (algo !== 'pbkdf2-sha256' || !iter || !saltB64 || !hashB64) return false;
	const iterations = Number(iter);
	if (!Number.isInteger(iterations) || iterations < 1 || iterations > ITERATIONS) return false;
	const hash = await derive(password, fromBase64Url(saltB64), iterations);
	return safeEqual(toBase64Url(hash), hashB64);
}
