<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);
</script>

<PageHeader title={l.services} description="Each one gets its own page and appears in the menu, grouped by category. The order here is the order on the website.">
	{#snippet actions()}
		{#if data.canWrite}<a href="/admin/services/new" class="btn-primary"><Icon name="plus" size={16} /> Add {l.service.toLowerCase()}</a>{/if}
	{/snippet}
</PageHeader>

<AdminList
	items={data.items}
	canWrite={data.canWrite}
	title={(i) => i.name}
	subtitle={(i) => i.category ?? 'No category'}
	image={(i) => i.image?.url}
	editHref={(i) => `/admin/services/${i.id}`}
	empty="No services yet."
>
	{#snippet extra(item)}
		{#if item.icon}<span class="hidden text-primary-700 sm:block"><Icon name={item.icon} size={18} /></span>{/if}
	{/snippet}
</AdminList>
