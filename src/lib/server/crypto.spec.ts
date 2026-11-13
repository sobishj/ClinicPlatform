import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, hmacSha256Hex, safeEqual, toBase64Url, fromBase64Url } from './crypto.js';

describe('password hashing (PBKDF2, Web Crypto)', () => {
	it('verifies the right password and rejects the wrong one', async () => {
		const hash = await hashPassword('correct horse battery');
		expect(hash.startsWith('pbkdf2-sha256$100000$')).toBe(true);
		expect(await verifyPassword('correct horse battery', hash)).toBe(true);
		expect(await verifyPassword('wrong password!!', hash)).toBe(false);
	});

	it('uses a random salt', async () => {
		expect(await hashPassword('same')).not.toEqual(await hashPassword('same'));
	});

	it('rejects malformed or over-cost hashes', async () => {
		expect(await verifyPassword('x', 'garbage')).toBe(false);
		expect(await verifyPassword('x', 'pbkdf2-sha256$9999999$AAAA$AAAA')).toBe(false);
	});
});

describe('helpers', () => {
	it('HMAC-SHA256 matches a known vector', async () => {
		// RFC 4231 test case 2
		expect(await hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe(
			'5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843'
		);
	});
	it('base64url round-trips', () => {
		const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
		expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
	});
	it('safeEqual', () => {
		expect(safeEqual('abc', 'abc')).toBe(true);
		expect(safeEqual('abc', 'abd')).toBe(false);
		expect(safeEqual('abc', 'abcd')).toBe(false);
	});
});
