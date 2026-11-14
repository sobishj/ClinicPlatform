<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const categories = $derived([...new Set(data.items.map((i) => i.category).filter(Boolean))]);
	let filter = $state('');
	const shown = $derived(filter ? data.items.filter((i) => i.category === filter) : data.items);
</script>

<Seo title="Gallery" description="Photos of {data.site.clinic.name}: our clinics, rooms and team." />
<PageHero title="Gallery" eyebrow="A look inside" />

<div class="container-page py-12">
	{#if categories.length > 1}
		<div class="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter photos">
			<button type="button" class="rounded-full px-4 py-2 text-sm font-medium {filter === '' ? 'bg-primary text-white' : 'border border-line bg-card'}" aria-pressed={filter === ''} onclick={() => (filter = '')}>All</button>
			{#each categories as c (c)}
				<button type="button" class="rounded-full px-4 py-2 text-sm font-medium {filter === c ? 'bg-primary text-white' : 'border border-line bg-card'}" aria-pressed={filter === c} onclick={() => (filter = c)}>{c}</button>
			{/each}
		</div>
	{/if}
	<ul class="grid grid-cols-2 gap-3 md:grid-cols-3">
		{#each shown as g (g.id)}
			<li>
				<figure class="overflow-hidden rounded-brand bg-surface-2">
					<a href={g.image.url} target="_blank" rel="noopener">
						<img src={g.image.url} alt={g.image.alt} width={g.image.width ?? 1200} height={g.image.height ?? 900} loading="lazy" decoding="async" class="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.05]" />
					</a>
					{#if g.caption}<figcaption class="px-3 py-2 text-sm">{g.caption}</figcaption>{/if}
				</figure>
			</li>
		{/each}
	</ul>
</div>
