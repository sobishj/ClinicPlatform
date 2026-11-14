<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fmt = (ms: number | null) => (ms ? new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'long' }).format(ms) : '');
</script>

<Seo title="Articles" description="Health tips and news from {data.site.clinic.name}." />
<PageHero title="Articles" eyebrow="Tips & news" />

<div class="container-page py-12">
	<ul class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each data.posts as p (p.slug)}
			<li class="group card card-lift overflow-hidden">
				{#if p.coverImage}<img src={p.coverImage.url} alt="" width="1200" height="800" loading="lazy" class="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />{/if}
				<div class="p-5">
					<p class="text-sm text-muted"><time datetime={p.publishedAt ? new Date(p.publishedAt).toISOString() : undefined}>{fmt(p.publishedAt)}</time></p>
					<h2 class="mt-1 font-heading text-xl"><a href="/blog/{p.slug}" class="hover:text-primary-700">{p.title}</a></h2>
					{#if p.excerpt}<p class="mt-2 text-sm text-muted">{p.excerpt}</p>{/if}
				</div>
			</li>
		{:else}
			<li class="text-muted">No articles yet.</li>
		{/each}
	</ul>
</div>
