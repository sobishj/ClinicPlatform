<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import ServiceCard from '#lib/components/site/ServiceCard.svelte';
	import { slugify } from '#lib/slug.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);
</script>

<Seo title={l.services} description="{l.services} offered at {data.site.clinic.name}: {data.groups.flatMap((g) => g.items.map((i) => i.name)).slice(0, 8).join(', ')}." />

<PageHero title="Our {l.services.toLowerCase()}" eyebrow={data.site.clinic.name} intro="Every treatment starts with a conversation. We explain the options and costs, and you decide.">
	{#if data.groups.length > 1}
		<ul class="flex flex-wrap gap-2" aria-label="Jump to a category">
			{#each data.groups as g (g.category)}<li><a href="#{slugify(g.category)}" class="inline-block rounded-full border border-line bg-card px-4 py-2 text-sm font-medium hover:border-primary">{g.category}</a></li>{/each}
		</ul>
	{/if}
</PageHero>

<div class="container-page space-y-16 py-16">
	{#each data.groups as g (g.category)}
		<section id={slugify(g.category)} aria-labelledby="cat-{slugify(g.category)}" class="scroll-mt-28">
			<h2 id="cat-{slugify(g.category)}" class="mb-6 text-2xl sm:text-3xl">{g.category}</h2>
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each g.items as svc (svc.id)}<li><ServiceCard service={svc} /></li>{/each}
			</ul>
		</section>
	{:else}
		<p class="text-muted">Details coming soon.</p>
	{/each}
</div>
