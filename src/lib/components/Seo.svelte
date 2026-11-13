<script lang="ts">
	import { page } from '$app/state';
	import { jsonLdScript } from '#lib/seo.js';

	interface Props {
		/** Page title without the site suffix. Omit on the homepage. */
		title?: string;
		description?: string | null;
		image?: string | null;
		type?: 'website' | 'article' | 'profile';
		/** Override the full <title> (e.g. homepage). */
		fullTitle?: string;
		jsonLd?: unknown[];
		noindex?: boolean;
	}
	let { title, description, image, type = 'website', fullTitle, jsonLd = [], noindex = false }: Props = $props();

	const site = $derived(page.data.site);
	const origin = $derived(page.url.origin);
	const computedTitle = $derived(
		fullTitle ??
			(title
				? site.seo.titleTemplate.replace('%s', title).replace('{clinic}', site.clinic.name)
				: site.seo.defaultTitle || [site.clinic.name, site.clinic.tagline].filter(Boolean).join(' — '))
	);
	const desc = $derived((description || site.seo.defaultDescription || site.clinic.tagline || '').slice(0, 300));
	const img = $derived(image || site.seo.ogImage || site.clinic.logo?.url || '');
	const absImg = $derived(img ? (img.startsWith('http') ? img : origin + img) : '');
	const canonical = $derived(origin + page.url.pathname);
	const robots = $derived(noindex || !site.seo.allowIndexing ? 'noindex, nofollow' : 'index, follow');
	const ld = $derived(jsonLd.filter(Boolean).map(jsonLdScript).join(''));
</script>

<svelte:head>
	<title>{computedTitle}</title>
	{#if desc}<meta name="description" content={desc} />{/if}
	<link rel="canonical" href={canonical} />
	<meta name="robots" content={robots} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={site.clinic.name} />
	<meta property="og:title" content={computedTitle} />
	{#if desc}<meta property="og:description" content={desc} />{/if}
	<meta property="og:url" content={canonical} />
	{#if absImg}<meta property="og:image" content={absImg} />{/if}
	<meta name="twitter:card" content={absImg ? 'summary_large_image' : 'summary'} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD is escaped by jsonLdScript -->
	{@html ld}
</svelte:head>
