<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.post);
	const date = $derived(p.publishedAt ? new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'long' }).format(p.publishedAt) : '');
	const ld = $derived({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: p.title,
		datePublished: p.publishedAt ? new Date(p.publishedAt).toISOString() : undefined,
		dateModified: new Date(p.updatedAt).toISOString(),
		image: p.coverImage ? page.url.origin + p.coverImage.url : undefined,
		publisher: { '@id': `${page.url.origin}/#organization` }
	});
</script>

<Seo title={p.seo?.title || p.title} description={p.seo?.description || p.excerpt} image={p.seo?.ogImage || p.coverImage?.url} type="article" jsonLd={[ld]} />

<PageHero title={p.title} eyebrow={date} intro={p.excerpt} crumbs={[{ href: '/blog', label: 'Articles' }]} />

<article class="container-page max-w-3xl py-12">
	{#if p.coverImage}<img src={p.coverImage.url} alt={p.coverImage.alt} width={p.coverImage.width ?? 1200} height={p.coverImage.height ?? 800} class="mb-10 w-full rounded-brand object-cover" />{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
	<div class="prose-clinic prose-lg">{@html p.content}</div>
</article>
