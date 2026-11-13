<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const pagesList = $derived(data.items.filter((i) => i.kind === 'page'));
	const posts = $derived(data.items.filter((i) => i.kind === 'post'));
	const url = (i: { kind: string; slug: string }) => (i.kind === 'post' ? `/blog/${i.slug}` : `/${i.slug}`);
</script>

<PageHeader title="Pages & blog" description="About, privacy and terms pages, your own custom pages, and blog articles.">
	{#snippet actions()}
		<a href="/admin/pages/new?kind=page" class="btn-outline"><Icon name="plus" size={16} /> New page</a>
		<a href="/admin/pages/new?kind=post" class="btn-primary"><Icon name="plus" size={16} /> New article</a>
	{/snippet}
</PageHeader>

<h2 class="mb-2 font-sans font-semibold">Pages</h2>
<AdminList items={pagesList} canWrite={true} sortable={false} title={(i) => i.title} subtitle={(i) => url(i) + (i.showInFooter ? ' · in footer' : '')} editHref={(i) => `/admin/pages/${i.id}`} />

<h2 class="mt-8 mb-2 font-sans font-semibold">
	Blog articles
	{#if !data.site.modules.blog}<span class="ml-2 text-xs font-medium text-amber-700">Blog module is off</span>{/if}
</h2>
<AdminList
	items={posts}
	canWrite={true}
	sortable={false}
	title={(i) => i.title}
	subtitle={(i) => (i.publishedAt ? new Date(i.publishedAt).toLocaleDateString() : 'Draft') + ' · ' + url(i)}
	editHref={(i) => `/admin/pages/${i.id}`}
	empty="No articles yet."
/>
