<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.page);
	const site = $derived(data.site);
	const isAbout = $derived(p.slug === 'about');
	const updated = $derived(new Intl.DateTimeFormat(site.clinic.locale, { dateStyle: 'long' }).format(p.updatedAt));
</script>

<Seo title={p.seo?.title || p.title} description={p.seo?.description || p.excerpt} image={p.seo?.ogImage || p.coverImage?.url} />

<PageHero title={p.title} intro={p.excerpt} />

<div class="container-page py-12 {isAbout ? 'grid gap-12 lg:grid-cols-[1fr_22rem]' : 'max-w-3xl'}">
	<article class="min-w-0">
		{#if p.coverImage && isAbout}<img src={p.coverImage.url} alt={p.coverImage.alt} width={p.coverImage.width ?? 1600} height={p.coverImage.height ?? 900} class="mb-10 aspect-[16/9] w-full rounded-brand object-cover" />{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
		<div class="prose-clinic prose-lg">{@html p.content}</div>
		{#if !isAbout}<p class="mt-10 text-sm text-muted">Last updated {updated}</p>{/if}
	</article>
	{#if isAbout}
		<aside class="space-y-6">
			<div class="card space-y-3 p-6">
				{#if site.clinic.foundedYear}<p><span class="font-heading text-3xl">{new Date().getFullYear() - site.clinic.foundedYear}+</span><br /><span class="text-sm text-muted">years caring for patients</span></p>{/if}
				<p><span class="font-heading text-3xl">{data.nav.locations.length}</span><br /><span class="text-sm text-muted">{data.nav.locations.length === 1 ? site.labels.location.toLowerCase() : site.labels.locations.toLowerCase()}</span></p>
				<div class="flex flex-wrap gap-2 pt-2">
					{#if site.modules.doctors}<a href="/doctors" class="btn-outline btn-sm">Meet the team</a>{/if}
					{#if site.modules.booking}<a href="/book" class="btn-primary btn-sm">{site.labels.bookCta}</a>{/if}
				</div>
			</div>
			{#if data.certifications.length}
				<div class="card p-6">
					<h2 class="mb-3 text-lg">{site.labels.certifications}</h2>
					<ul class="space-y-2 text-sm">{#each data.certifications as c (c.id)}<li class="flex gap-2"><Icon name="badge-check" size={18} class="shrink-0 text-primary-700" /> {c.title}</li>{/each}</ul>
				</div>
			{/if}
		</aside>
	{/if}
</div>
