<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);
</script>

<PageHeader title={l.doctors} description="Profiles shown on the website. Each one can work at several branches with different days and times.">
	{#snippet actions()}
		{#if data.canWrite}<a href="/admin/doctors/new" class="btn-primary"><Icon name="plus" size={16} /> Add {l.doctor.toLowerCase()}</a>{/if}
	{/snippet}
</PageHeader>

<AdminList
	items={data.items}
	canWrite={data.canWrite}
	title={(i) => `${i.title ? i.title + ' ' : ''}${i.name}`}
	subtitle={(i) => [i.qualifications, i.branches.join(', ') || 'No branch yet'].filter(Boolean).join(' · ')}
	image={(i) => i.photo?.url}
	editHref={(i) => `/admin/doctors/${i.id}`}
	empty="No profiles yet."
>
	{#snippet extra(item)}
		{#if item.featured}<span class="hidden rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 md:inline">Homepage</span>{/if}
	{/snippet}
</AdminList>
