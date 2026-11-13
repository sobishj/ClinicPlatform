<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import FaqList from '#lib/components/site/FaqList.svelte';
	import ServiceCard from '#lib/components/site/ServiceCard.svelte';
	import { bookHref, doctorName } from '#lib/links.js';
	import { formatPrice } from '#lib/format.js';
	import { faqLd, serviceLd, breadcrumbLd } from '#lib/seo.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.service);
	const site = $derived(data.site);
	const l = $derived(site.labels);
	const origin = $derived(page.url.origin);
</script>

<Seo
	title={s.seo?.title || s.name}
	description={s.seo?.description || s.summary}
	image={s.seo?.ogImage || s.image?.url}
	jsonLd={[serviceLd(s, origin), faqLd(s.faqs), breadcrumbLd([{ name: l.services, url: '/services' }, { name: s.name, url: `/services/${s.slug}` }], origin)]}
/>

<PageHero title={s.name} eyebrow={s.category ?? l.service} intro={s.summary} crumbs={[{ href: '/services', label: l.services }]}>
	<div class="flex flex-wrap items-center gap-3">
		{#if site.modules.booking}<a href={bookHref({ service: s.slug })} class="btn-primary"><Icon name="calendar-check" size={18} /> {l.bookCta}</a>{/if}
		{#if s.price != null}<span class="text-sm text-muted">{s.priceFrom ? 'From ' : ''}<strong class="text-ink">{formatPrice(s.price, site.clinic.currency, site.clinic.locale)}</strong></span>{/if}
		{#if s.durationMinutes}<span class="inline-flex items-center gap-1 text-sm text-muted"><Icon name="clock" size={16} /> About {s.durationMinutes} min</span>{/if}
	</div>
</PageHero>

<div class="container-page grid gap-12 py-14 lg:grid-cols-[1fr_22rem]">
	<article class="min-w-0 space-y-12">
		{#if s.image}
			<img src={s.image.url} alt={s.image.alt} width={s.image.width ?? 1200} height={s.image.height ?? 900} class="aspect-[16/9] w-full rounded-brand object-cover" />
		{/if}
		{#if s.content}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
			<div class="prose-clinic prose-lg">{@html s.content}</div>
		{/if}

		{#if s.benefits.length}
			<section aria-labelledby="benefits">
				<h2 id="benefits" class="mb-5 text-2xl">Benefits</h2>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each s.benefits as b (b)}
						<li class="flex gap-3 rounded-brand bg-primary-50 p-4"><Icon name="check" size={20} class="shrink-0 text-primary-700" /> {b}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if s.steps.length}
			<section aria-labelledby="steps">
				<h2 id="steps" class="mb-5 text-2xl">What to expect</h2>
				<ol class="space-y-5">
					{#each s.steps as step, i (i)}
						<li class="flex gap-4">
							<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">{i + 1}</span>
							<div><h3 class="font-heading text-lg">{step.title}</h3>{#if step.description}<p class="mt-1 text-muted">{step.description}</p>{/if}</div>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if s.faqs.length}
			<section aria-labelledby="faqs">
				<h2 id="faqs" class="mb-5 text-2xl">Questions about {s.name.toLowerCase()}</h2>
				<FaqList items={s.faqs} />
			</section>
		{/if}
	</article>

	<aside class="space-y-6 lg:sticky lg:top-28 lg:self-start">
		{#if site.modules.booking}
			<div class="card bg-primary-800 p-6 text-white">
				<h2 class="text-xl text-white">Ready to talk it through?</h2>
				<p class="mt-2 text-sm text-white/85">Request an appointment and we will call you to confirm.</p>
				<a href={bookHref({ service: s.slug })} class="btn-light mt-4 w-full">{l.bookCta}</a>
			</div>
		{/if}
		{#if data.locations.length}
			<div class="card p-6">
				<h2 class="mb-3 text-lg">Available at</h2>
				<ul class="space-y-2">
					{#each data.locations as loc (loc.id)}
						<li class="flex items-center justify-between gap-2 text-sm">
							<a href="/locations/{loc.slug}" class="font-medium hover:text-primary-700">{loc.name}</a>
							{#if site.modules.booking}<a href={bookHref({ service: s.slug, location: loc.slug })} class="text-primary-700 hover:underline">Book here<span class="sr-only"> at {loc.name}</span></a>{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if data.doctors.length && site.modules.doctors}
			<div class="card p-6">
				<h2 class="mb-3 text-lg">Your {l.doctors.toLowerCase()}</h2>
				<ul class="space-y-3">
					{#each data.doctors as d (d.id)}
						<li>
							<a href="/doctors/{d.slug}" class="flex items-center gap-3 hover:text-primary-700">
								{#if d.photo}<img src={d.photo.url} alt="" width="48" height="48" loading="lazy" class="size-12 rounded-full object-cover" />{/if}
								<span><span class="block font-medium">{doctorName(d)}</span><span class="text-xs text-muted">{d.qualifications}</span></span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</aside>
</div>

{#if data.related.length}
	<section class="bg-surface-2 py-14" aria-labelledby="related">
		<div class="container-page">
			<h2 id="related" class="mb-6 text-2xl">Related {l.services.toLowerCase()}</h2>
			<ul class="grid gap-4 sm:grid-cols-3">{#each data.related as r (r.slug)}<li><ServiceCard service={r} /></li>{/each}</ul>
		</div>
	</section>
{/if}
