import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { getDb, cacheGet, cachePut } from '#lib/server/platform.js';
import { loadSettings } from '#lib/server/settings.js';
import { validateSession, SESSION_COOKIE } from '#lib/server/auth.js';
import { buildCsp } from '#lib/server/csp.js';
import { randomToken } from '#lib/server/crypto.js';
import { primeEmbedHashes } from '#lib/chatbot/embed.js';
import { processDueDeliveries } from '#lib/server/integrations/webhooks.js';
import { background } from '#lib/server/platform.js';

/** Anonymous public pages are cached for this long (and invalidated on any content change). */
const PAGE_CACHE_SECONDS = 600;
/** Webhook retries also run opportunistically (in the background) on admin traffic. */
let lastRetrySweep = 0;
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/setup', '/admin/forgot', '/admin/reset'];

function isCacheable(event: Parameters<Handle>[0]['event']): boolean {
	// Never cache while developing, so code changes show up immediately.
	if (dev) return false;
	if (event.request.method !== 'GET') return false;
	const p = event.url.pathname;
	if (p.startsWith('/admin') || p.startsWith('/api/') || p.startsWith('/media/') || p.startsWith('/book/')) return false;
	if (event.cookies.get(SESSION_COOKIE)) return false;
	// Booking confirmation pages and anything with a form result must not be cached.
	if (event.url.searchParams.has('ref') || event.url.search.includes('/')) return false;
	return true;
}

export const handle: Handle = async ({ event, resolve }) => {
	const db = getDb(event.platform);
	event.locals.db = db;
	const { settings, version } = await loadSettings(db);
	event.locals.settings = settings;
	event.locals.user = null;
	event.locals.sessionId = null;

	const path = event.url.pathname;
	const isAdmin = path.startsWith('/admin');

	if (event.cookies.get(SESSION_COOKIE) && (isAdmin || path.startsWith('/api/'))) {
		const session = await validateSession(db, event.cookies);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionId = session.sessionId;
		}
	}

	// Admin guard (defence in depth: every admin load/action also checks permissions itself).
	if (isAdmin && !PUBLIC_ADMIN_PATHS.some((p) => path === p || path.startsWith(p + '/')) && !event.locals.user) {
		if (event.request.method === 'GET') {
			return new Response(null, {
				status: 303,
				headers: { location: `/admin/login?next=${encodeURIComponent(path + event.url.search)}` }
			});
		}
		return new Response('Unauthorized', { status: 401 });
	}

	if (isAdmin && event.locals.user && Date.now() - lastRetrySweep > 5 * 60_000) {
		lastRetrySweep = Date.now();
		background(event.platform, processDueDeliveries(db, 10));
	}

	// Inline chatbot snippets need their CSP hashes computed before the header is built.
	if (settings.modules.chatbot && settings.chatbot.provider === 'embed' && settings.chatbot.embedCode) {
		await primeEmbedHashes(settings.chatbot.embedCode);
	}

	const cacheable = isCacheable(event);
	const cacheKey = `/${version}${path}${event.url.search}`;

	if (cacheable) {
		const hit = await cacheGet(event.platform, cacheKey);
		if (hit) return withFreshNonce(hit);
	}

	const response = await resolve(event, {
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
	});

	applySecurityHeaders(response, event.url, settings);

	if (isAdmin) {
		response.headers.set('cache-control', 'private, no-store');
		response.headers.set('x-robots-tag', 'noindex, nofollow');
	}

	if (
		cacheable &&
		response.status === 200 &&
		!response.headers.has('set-cookie') &&
		!/no-store|private/.test(response.headers.get('cache-control') ?? '') &&
		/text\/html|application\/json/.test(response.headers.get('content-type') ?? '')
	) {
		response.headers.set('cache-control', 'public, max-age=0, must-revalidate');
		await cachePut(event.platform, cacheKey, response.clone(), PAGE_CACHE_SECONDS).catch(() => {});
	}
	return response;
};

/**
 * Cached HTML carries the nonce of the render that produced it. Swap in a fresh nonce
 * (in both the CSP header and the markup) so nonces are never reused across responses.
 */
async function withFreshNonce(hit: Response): Promise<Response> {
	const csp = hit.headers.get('content-security-policy');
	const old = csp ? /'nonce-([^']+)'/.exec(csp)?.[1] : undefined;
	const headers = new Headers(hit.headers);
	headers.set('x-cache', 'HIT');
	// Body may change length (nonce swap) and is never re-compressed here.
	headers.delete('content-length');
	headers.delete('content-encoding');
	if (!old || !(headers.get('content-type') ?? '').includes('text/html')) {
		return new Response(hit.body, { status: hit.status, headers });
	}
	const fresh = randomToken(16);
	const body = (await hit.text()).replaceAll(old, fresh);
	headers.set('content-security-policy', csp!.replaceAll(old, fresh));
	return new Response(body, { status: hit.status, headers });
}

function applySecurityHeaders(response: Response, url: URL, settings: App.Locals['settings']) {
	const h = response.headers;
	h.set('x-content-type-options', 'nosniff');
	h.set('referrer-policy', 'strict-origin-when-cross-origin');
	h.set('x-frame-options', 'SAMEORIGIN');
	h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	if (url.protocol === 'https:') h.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	const csp = h.get('content-security-policy');
	if (csp) h.set('content-security-policy', buildCsp(csp, settings, url.pathname.startsWith('/admin')));
}

export const handleError: HandleServerError = (caught) => {
	if (caught.kind === 'unknown') {
		console.error(caught.error);
		return { message: 'Something went wrong. Please try again.' };
	}
	if (caught.kind === 'framework' && caught.error.status === 404) return { message: 'Page not found' };
	// App and validation errors keep their own (safe) message.
};
