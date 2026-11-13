import { json, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { apiKeys } from '../db/schema.js';
import { randomToken, sha256Hex } from '../crypto.js';
import { rateLimit, clientIp } from '../rate-limit.js';
import type { DB } from '../db/index.js';
import { ZodError } from 'zod';
import { zodErrors } from '../forms.js';

export const API_SCOPES = {
	read: 'Read locations, doctors, services, FAQs and availability',
	'appointments:create': 'Create appointment requests',
	'appointments:read': 'List and read appointments (contains patient data)',
	'appointments:write': 'Update appointment status and dates',
	'content:write': 'Update locations, doctors and services'
} as const;
export type ApiScope = keyof typeof API_SCOPES;

const PREFIX = 'ck_';

/** New key: shown once to the admin; only its SHA-256 is stored. */
export async function generateApiKey() {
	const key = `${PREFIX}${randomToken(24)}`;
	return { key, prefix: key.slice(0, 10), hash: await sha256Hex(key) };
}

export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fields?: Record<string, string>
	) {
		super(message);
	}
}

export function apiError(err: ApiError, headers?: HeadersInit) {
	return json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } }, { status: err.status, headers });
}

/**
 * Authenticate an API request with `Authorization: Bearer <key>` (or `X-API-Key`).
 * Applies a per-key rate limit and updates last-used (at most once a minute).
 */
export async function requireApiKey(event: RequestEvent, scope: ApiScope) {
	const db: DB = event.locals.db;
	const header = event.request.headers.get('authorization');
	const raw = header?.startsWith('Bearer ') ? header.slice(7).trim() : event.request.headers.get('x-api-key')?.trim();
	if (!raw || !raw.startsWith(PREFIX)) {
		// Count anonymous failures per IP to slow down key guessing.
		await rateLimit(db, `api:anon:${clientIp(event.request, event.getClientAddress)}`, 60, 600);
		throw new ApiError(401, 'unauthorized', 'Missing API key. Send it as "Authorization: Bearer <key>".');
	}
	const row = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, await sha256Hex(raw))).get();
	if (!row || row.revokedAt) throw new ApiError(401, 'unauthorized', 'Invalid or revoked API key.');
	if (!row.scopes.includes(scope)) throw new ApiError(403, 'forbidden', `This key does not have the "${scope}" scope.`);
	const limit = await rateLimit(db, `api:key:${row.id}`, 600, 600);
	if (!limit.allowed) throw new ApiError(429, 'rate_limited', 'Rate limit exceeded (600 requests per 10 minutes). Try again later.');
	if (!row.lastUsedAt || Date.now() - row.lastUsedAt > 60_000) {
		await db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, row.id));
	}
	event.locals.apiKey = { id: row.id, name: row.name, scopes: row.scopes };
	return row;
}

/** CORS headers for browser callers listed in Integrations → allowed origins. */
export function corsHeaders(event: RequestEvent): Record<string, string> {
	const origin = event.request.headers.get('origin');
	if (!origin) return {};
	const allowed = event.locals.settings.integrations.corsOrigins
		.split(',')
		.map((o) => o.trim().replace(/\/$/, ''))
		.filter(Boolean);
	if (!allowed.includes(origin) && !allowed.includes('*')) return {};
	return {
		'access-control-allow-origin': origin,
		'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
		'access-control-allow-headers': 'authorization, content-type, x-api-key',
		'access-control-max-age': '86400',
		vary: 'origin'
	};
}

/** Wrap an API handler: auth, JSON errors, CORS. */
export function apiHandler(scope: ApiScope | null, fn: (event: RequestEvent) => Promise<Response | unknown>) {
	return async (event: RequestEvent) => {
		const cors = corsHeaders(event);
		try {
			if (scope) await requireApiKey(event, scope);
			const out = await fn(event);
			const res = out instanceof Response ? out : json(out, { headers: { 'cache-control': 'private, max-age=0, no-store' } });
			for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
			return res;
		} catch (err) {
			if (err instanceof ApiError) return apiError(err, cors);
			if (err instanceof ZodError) return apiError(new ApiError(422, 'validation_failed', 'Some fields are invalid.', zodErrors(err)), cors);
			console.error('[api]', err);
			return apiError(new ApiError(500, 'server_error', 'Unexpected error.'), cors);
		}
	};
}

export function optionsHandler(event: RequestEvent) {
	return new Response(null, { status: 204, headers: corsHeaders(event) });
}
