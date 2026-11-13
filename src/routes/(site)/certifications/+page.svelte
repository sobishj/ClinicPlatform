<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);
</script>

<Seo title={l.certifications} description="Accreditations and certifications held by {data.site.clinic.name}." />

<PageHero title="{l.certifications} & accreditations" eyebrow="Quality you can trust" intro="Independent checks on our clinical standards, hygiene and patient care." />

<div class="container-page py-12">
	<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.items as c (c.id)}
			<li class="card flex flex-col p-6">
				{#if c.image}<img src={c.image.url} alt={c.image.alt} width="200" height="200" loading="lazy" class="mb-4 h-28 w-auto self-start object-contain" />{/if}
				<h2 class="font-heading text-xl">{c.title}</h2>
				{#if c.issuer || c.year}<p class="mt-1 text-sm font-medium text-primary-800">{[c.issuer, c.year].filter(Boolean).join(' · ')}</p>{/if}
				{#if c.description}<p class="mt-3 text-sm leading-relaxed text-muted">{c.description}</p>{/if}
				{#if c.pdfUrl}
					<a href={c.pdfUrl} target="_blank" rel="noopener" class="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary-700 hover:underline">
						<Icon name="file-text" size={16} /> View certificate (PDF)<span class="sr-only">: {c.title}</span>
					</a>
				{/if}
			</li>
		{:else}
			<li class="text-muted">Details coming soon.</li>
		{/each}
	</ul>
</div>
