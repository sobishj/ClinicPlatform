import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/env';
import {
	getPlatformDb,
	getTenantDb,
	cacheGet,
	cachePut,
	background
} from '#lib/server/platform.js';
import { loadSettings } from '#lib/server/settings.js';
import { validateSession, SESSION_COOKIE } from '#lib/server/auth.js';
import { validateConsoleSession } from '#lib/server/console/auth.js';
import { CONSOLE_HOST } from '#lib/server/console/host.js';
import { resolveHost } from '#lib/server/tenancy/hosts.js';
import { domains } from '#lib/server/platform-db/schema.js';
import { buildCsp } from '#lib/server/csp.js';
import { randomToken } from '#lib/server/crypto.js';
import { primeEmbedHashes } from '#lib/chatbot/embed.js';
import { processDueDeliveries } from '#lib/server/integrations/webhooks.js';
import { defaultSettings, type Settings } from '#lib/settings/schema.js';
import { eq } from 'drizzle-orm';

/** Anonymous public pages are cached for this long (and invalidated on any content change). */
const PAGE_CACHE_SECONDS = 600;
/** Webhook retries also run opportunistically (in the background) on admin traffic, per client. */
const lastRetrySweep = new Map<string, number>();
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot', '/admin/reset', '/admin/sso'];
const PUBLIC_CONSOLE_PATHS = ['/console/login', '/console/setup', '/console/cron'];

const isUnder = (path: string, prefixes: string[]) =>
	prefixes.some((p) => path === p || path.startsWith(p + '/'));

function isCacheable(event: RequestEvent): boolean {
	// Never cache while developing, so code changes show up immediately.
	if (dev) return false;
	if (event.request.method !== 'GET') return false;
	const p = event.url.pathname;
	if (
		p.startsWith('/admin') ||
		p.startsWith('/api/') ||
		p.startsWith('/media/') ||
		p.startsWith('/book/')
	)
		return false;
	if (event.cookies.get(SESSION_COOKIE)) return false;
	// Booking confirmation pages and anything with a form result must not be cached.
	if (event.url.searchParams.has('ref') || event.url.search.includes('/')) return false;
	return true;
}

/** Bare responses for requests that don't belong to any site: no branding of any kind. */
function bare(status: number, title: string, extra = ''): Response {
	return new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:15vh auto;padding:0 1rem;color:#333"><h1 style="font-size:1.4rem">${title}</h1>${extra}</body></html>`,
		{
			status,
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'cache-control': 'no-store',
				'x-robots-tag': 'noindex'
			}
		}
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const hostname = event.url.hostname.toLowerCase();
	const path = event.url.pathname;
	const pdb = await getPlatformDb(event.platform);
	event.locals.platformDb = pdb;
	event.locals.user = null;
	event.locals.sessionId = null;
	event.locals.consoleUser = null;
	event.locals.tenant = null;

	// Health check for containers / load balancers (any host): the platform database answers.
	if (path === '/_internal/health')
		return new Response('ok', { headers: { 'cache-control': 'no-store' } });

	// On-demand TLS (Caddy `ask`): is this host one of ours?
	if (path === '/_internal/domain-check') {
		const host = (event.url.searchParams.get('domain') ?? '').toLowerCase();
		const known =
			host === CONSOLE_HOST ||
			!!(await pdb
				.select({ id: domains.id })
				.from(domains)
				.where(eq(domains.hostname, host))
				.get());
		return new Response(known ? 'ok' : 'unknown', { status: known ? 200 : 404 });
	}

	// ── Console (super admin) host ──
	if (hostname === CONSOLE_HOST) {
		event.locals.settings = defaultSettings();
		if (path === '/') return new Response(null, { status: 303, headers: { location: '/console' } });
		if (!path.startsWith('/console')) return bare(404, 'Not found');
		event.locals.consoleUser = await validateConsoleSession(pdb, event.cookies);
		if (!event.locals.consoleUser && !isUnder(path, PUBLIC_CONSOLE_PATHS)) {
			if (event.request.method === 'GET')
				return new Response(null, {
					status: 303,
					headers: {
						location: `/console/login?next=${encodeURIComponent(path + event.url.search)}`
					}
				});
			return new Response('Unauthorized', { status: 401 });
		}
		const response = await resolve(event, {
			preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
		});
		applySecurityHeaders(response, event.url, event.locals.settings, true);
		response.headers.set('cache-control', 'private, no-store');
		response.headers.set('x-robots-tag', 'noindex, nofollow');
		return response;
	}
	if (path.startsWith('/console')) return bare(404, 'Not found');

	// ── Client sites ──
	const site = await resolveHost(pdb, hostname);
	if (!site) {
		if (!dev) return bare(404, 'Not found');
		const known = await pdb.select({ hostname: domains.hostname }).from(domains);
		const port = event.url.port ? `:${event.url.port}` : '';
		const links = [CONSOLE_HOST, ...known.map((d) => d.hostname)]
			.map((h) => `<li><a href="${event.url.protocol}//${h}${port}/">${h}</a></li>`)
			.join('');
		return bare(
			404,
			'No site uses this address',
			`<p>Development help (only shown in dev): known addresses</p><ul>${links}</ul>`
		);
	}
	if (site.tenant.status === 'suspended') return bare(503, 'This site is temporarily unavailable');

	// One public address per client: every other address redirects to the primary.
	if (site.primaryHost && site.primaryHost !== hostname) {
		const target = new URL(event.url);
		target.hostname = site.primaryHost;
		const method = event.request.method;
		const status = method === 'GET' || method === 'HEAD' ? (dev ? 302 : 301) : 308;
		return new Response(null, { status, headers: { location: target.href } });
	}

	const db = await getTenantDb(event.platform, site.tenant.dbRef);
	event.locals.tenant = site.tenant;
	event.locals.db = db;
	const { settings, version } = await loadSettings(db);
	event.locals.settings = settings;

	const isAdmin = path.startsWith('/admin');

	if (event.cookies.get(SESSION_COOKIE) && (isAdmin || path.startsWith('/api/'))) {
		const session = await validateSession(db, event.cookies);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionId = session.sessionId;
		}
	}

	// Admin guard (defence in depth: every admin load/action also checks permissions itself).
	if (isAdmin && !isUnder(path, PUBLIC_ADMIN_PATHS) && !event.locals.user) {
		if (event.request.method === 'GET') {
			return new Response(null, {
				status: 303,
				headers: { location: `/admin/login?next=${encodeURIComponent(path + event.url.search)}` }
			});
		}
		return new Response('Unauthorized', { status: 401 });
	}

	if (
		isAdmin &&
		event.locals.user &&
		Date.now() - (lastRetrySweep.get(site.tenant.id) ?? 0) > 5 * 60_000
	) {
		lastRetrySweep.set(site.tenant.id, Date.now());
		background(event.platform, processDueDeliveries(db, 10));
	}

	// Inline chatbot snippets need their CSP hashes computed before the header is built.
	if (
		settings.modules.chatbot &&
		settings.chatbot.provider === 'embed' &&
		settings.chatbot.embedCode
	) {
		await primeEmbedHashes(settings.chatbot.embedCode);
	}

	const cacheable = isCacheable(event);
	// Cache keys always start with the client id, so clients can never see each other's pages.
	const cacheKey = `/${site.tenant.id}/${version}${path}${event.url.search}`;

	if (cacheable) {
		const hit = await cacheGet(event.platform, cacheKey);
		if (hit) return withFreshNonce(hit);
	}

	const response = await resolve(event, {
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
	});

	applySecurityHeaders(response, event.url, settings, isAdmin);

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
	// Browsers always revalidate pages; only the edge/memory cache keeps them.
	headers.set('cache-control', 'public, max-age=0, must-revalidate');
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

function applySecurityHeaders(
	response: Response,
	url: URL,
	settings: Settings,
	adminArea: boolean
) {
	const h = response.headers;
	h.set('x-content-type-options', 'nosniff');
	h.set('referrer-policy', 'strict-origin-when-cross-origin');
	h.set('x-frame-options', 'SAMEORIGIN');
	h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	if (url.protocol === 'https:')
		h.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	const csp = h.get('content-security-policy');
	if (csp) h.set('content-security-policy', buildCsp(csp, settings, adminArea));
}

export const handleError: HandleServerError = (caught) => {
	if (caught.kind === 'unknown') {
		console.error(caught.error);
		return { message: 'Something went wrong. Please try again.' };
	}
	if (caught.kind === 'framework' && caught.error.status === 404)
		return { message: 'Page not found' };
	// App and validation errors keep their own (safe) message.
};
