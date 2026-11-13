import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
	const body = locals.settings.seo.allowIndexing
		? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${url.origin}/sitemap.xml\n`
		: `User-agent: *\nDisallow: /\n`;
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
