import { describe, it, expect } from 'vitest';
import { signPayload, verifySignature, BACKOFF_MS, MAX_ATTEMPTS } from './webhooks.js';

describe('webhook signatures', () => {
	const secret = 'whsec_test';
	const body = JSON.stringify({ event: 'appointment.created', data: { id: 1 } });

	it('signs and verifies', async () => {
		const ts = Math.floor(Date.now() / 1000);
		const header = await signPayload(secret, body, ts);
		expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
		expect(await verifySignature(secret, body, header)).toBe(true);
	});

	it('rejects tampering, wrong secrets and stale timestamps', async () => {
		const ts = Math.floor(Date.now() / 1000);
		const header = await signPayload(secret, body, ts);
		expect(await verifySignature(secret, body + ' ', header)).toBe(false);
		expect(await verifySignature('other', body, header)).toBe(false);
		const old = await signPayload(secret, body, ts - 3600);
		expect(await verifySignature(secret, body, old)).toBe(false);
	});

	it('backs off with increasing delays', () => {
		expect(MAX_ATTEMPTS).toBe(BACKOFF_MS.length + 1);
		for (let i = 1; i < BACKOFF_MS.length; i++) expect(BACKOFF_MS[i]).toBeGreaterThan(BACKOFF_MS[i - 1]);
	});
});
