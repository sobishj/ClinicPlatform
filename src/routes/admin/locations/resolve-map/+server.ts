import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth.js';
import { parseMapInput } from '#lib/maps.js';
import type { RequestHandler } from './$types';

const SHORT = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i;

/** Expand a Google Maps short link (follows up to 5 redirects, Google hosts only) and parse it. */
export const POST: RequestHandler = async (event) => {
	requirePermission(event, 'content:write');
	const { url } = (await event.request.json().catch(() => ({}))) as { url?: string };
	if (!url || !SHORT.test(url)) return json({ error: 'Not a Google Maps short link.' });
	let current = url;
	try {
		for (let i = 0; i < 5; i++) {
			const res = await fetch(current, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; ClinicSite/1.0)' } });
			const next = res.headers.get('location');
			if (!next) break;
			current = new URL(next, current).toString();
			const host = new URL(current).hostname;
			if (!/(^|\.)google\.[a-z.]+$|goo\.gl$/.test(host)) return json({ error: 'The link did not lead to Google Maps.' });
			if (!SHORT.test(current)) break;
		}
	} catch {
		return json({ error: 'Could not reach Google to expand the link. Paste the full link or embed code instead.' });
	}
	const parsed = parseMapInput(current);
	if (parsed.needsResolve) return json({ error: 'Could not expand the short link.' });
	// Keep the friendly share link for "Get directions" if we found no coordinates.
	if (!parsed.directionsUrl) parsed.directionsUrl = url;
	return json(parsed);
};
