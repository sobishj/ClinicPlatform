<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);
</script>

<PageHeader title={l.locations} description="Branches shown on the website and offered in booking. The first one is treated as the main branch.">
	{#snippet actions()}
		{#if data.canWrite}<a href="/admin/locations/new" class="btn-primary"><Icon name="plus" size={16} /> Add {l.location.toLowerCase()}</a>{/if}
	{/snippet}
</PageHeader>

<AdminList
	items={data.items}
	canWrite={data.canWrite}
	title={(i) => i.name}
	subtitle={(i) => [i.type, i.area, i.city].filter(Boolean).join(' · ') + (i.hasMap ? '' : ' · no map yet')}
	image={(i) => i.photos[0]?.url}
	editHref={(i) => `/admin/locations/${i.id}`}
	empty="No locations yet. Add your first branch."
/>
