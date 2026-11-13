import { and, eq } from 'drizzle-orm';
import { locations, doctors, services, pages } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const db = locals.db;
	const m = locals.settings.modules;
	const origin = url.origin;
	const entries: Array<{ loc: string; lastmod?: number; priority?: string }> = [{ loc: '/', priority: '1.0' }];

	const [locs, docs, svcs, pgs] = await Promise.all([
		m.locations ? db.select({ slug: locations.slug, u: locations.updatedAt }).from(locations).where(eq(locations.active, true)) : [],
		m.doctors ? db.select({ slug: doctors.slug, u: doctors.updatedAt }).from(doctors).where(eq(doctors.active, true)) : [],
		m.services ? db.select({ slug: services.slug, u: services.updatedAt }).from(services).where(eq(services.active, true)) : [],
		db.select({ slug: pages.slug, kind: pages.kind, u: pages.updatedAt }).from(pages).where(and(eq(pages.published, true)))
	]);

	if (m.services) entries.push({ loc: '/services', priority: '0.9' }, ...svcs.map((s) => ({ loc: `/services/${s.slug}`, lastmod: s.u, priority: '0.8' })));
	if (m.doctors) entries.push({ loc: '/doctors', priority: '0.8' }, ...docs.map((d) => ({ loc: `/doctors/${d.slug}`, lastmod: d.u, priority: '0.7' })));
	if (m.locations) entries.push({ loc: '/locations', priority: '0.9' }, ...locs.map((l) => ({ loc: `/locations/${l.slug}`, lastmod: l.u, priority: '0.9' })));
	if (m.certifications) entries.push({ loc: '/certifications' });
	if (m.gallery) entries.push({ loc: '/gallery' });
	if (m.booking) entries.push({ loc: '/book', priority: '0.8' });
	entries.push({ loc: '/contact', priority: '0.8' });
	for (const p of pgs) {
		if (p.kind === 'post') {
			if (m.blog) entries.push({ loc: `/blog/${p.slug}`, lastmod: p.u });
		} else entries.push({ loc: `/${p.slug}`, lastmod: p.u, priority: p.slug === 'about' ? '0.7' : '0.3' });
	}
	if (m.blog) entries.push({ loc: '/blog' });

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`  <url><loc>${esc(origin + e.loc)}</loc>${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}${e.priority ? `<priority>${e.priority}</priority>` : ''}</url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
