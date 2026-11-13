<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ModuleKey } from '#lib/settings/schema.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const moduleOn = (m?: string) => !m || data.site.modules[m as ModuleKey];
</script>

<PageHeader title="Content blocks" description="Short lists used on the homepage and other pages. Sections whose module is switched off are hidden on the website." />

<ul class="grid gap-3 sm:grid-cols-2">
	{#each data.collections as c (c.key)}
		<li>
			<a href="/admin/content/{c.key}" class="card flex h-full items-start gap-4 p-4 hover:border-primary">
				<div class="min-w-0 flex-1">
					<p class="font-semibold">{c.label} <span class="ml-1 text-sm font-normal text-muted">({c.count})</span></p>
					<p class="text-sm text-muted">{c.description}</p>
					{#if !moduleOn(c.module)}
						<p class="mt-1 text-xs font-medium text-amber-700">Module off — not shown on the website</p>
					{/if}
				</div>
				<Icon name="chevron-right" class="mt-1 text-muted" />
			</a>
		</li>
	{/each}
</ul>
