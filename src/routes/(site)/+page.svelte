<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import HeroSlideshow from '#lib/components/site/HeroSlideshow.svelte';
	import SectionHeading from '#lib/components/site/SectionHeading.svelte';
	import ServiceCard from '#lib/components/site/ServiceCard.svelte';
	import DoctorCard from '#lib/components/site/DoctorCard.svelte';
	import LocationCard from '#lib/components/site/LocationCard.svelte';
	import MapTabs from '#lib/components/site/MapTabs.svelte';
	import FaqList from '#lib/components/site/FaqList.svelte';
	import Stars from '#lib/components/site/Stars.svelte';
	import { telLink } from '#lib/format.js';
	import { slugify } from '#lib/slug.js';
	import { organizationLd, locationLd, faqLd } from '#lib/seo.js';
	import type { HomepageSection } from '#lib/settings/schema.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const l = $derived(site.labels);
	const tz = $derived(site.clinic.timeZone);
	const locale = $derived(site.clinic.locale);
	const phone = $derived(site.clinic.phones[0]);
	const origin = $derived(page.url.origin);

	const ld = $derived([
		organizationLd(site.clinic, origin, data.nav.locations as never),
		...data.locations.map((loc) => locationLd(loc, site.clinic, origin)),
		data.sections.some((s) => s.id === 'faq') ? faqLd(data.faqs) : null
	]);
	// Alternate section backgrounds for rhythm (hero/cta excluded).
	const tinted = $derived.by(() => {
		const set = new Set<string>();
		let n = 0;
		for (const s of data.sections) {
			if (s.id === 'hero' || s.id === 'cta') continue;
			if (n++ % 2 === 1) set.add(s.id);
		}
		return set;
	});
	const dateFmt = (d: string) => {
		try {
			return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(d));
		} catch {
			return d;
		}
	};
</script>

<Seo jsonLd={ld} image={data.slides[0]?.image.url} />

{#if !(data.sections[0]?.id === 'hero' && (data.slides[0]?.heading || !data.slides.length))}
	<h1 class="sr-only">{site.clinic.name}{site.clinic.tagline ? ` — ${site.clinic.tagline}` : ''}</h1>
{/if}

{#snippet heading(s: HomepageSection, align: 'left' | 'center' = 'left')}
	<SectionHeading eyebrow={s.eyebrow} heading={s.heading} intro={s.intro} {align} id="h-{s.id}" />
{/snippet}

{#each data.sections as s, i (s.id)}
	{#if s.id === 'hero'}
		<HeroSlideshow
			slides={data.slides}
			settings={site.hero}
			fallback={{ title: site.clinic.name, subtitle: site.clinic.tagline, ctaText: site.modules.booking ? l.bookCta : undefined, ctaHref: '/book' }}
			secondary={phone ? { text: 'Call us', href: telLink(phone) } : null}
		/>
	{:else if s.id === 'intents' && data.intents.length}
		<section class="relative z-20 {data.sections[0]?.id === 'hero' && data.slides.length ? 'pt-8 md:-mt-14 md:pt-0' : 'pt-16'} pb-4" aria-labelledby="h-intents">
			<div class="container-page">
				<div class="card overflow-hidden shadow-xl">
					<h2 id="h-intents" class="border-b border-line px-6 py-4 font-heading text-xl">{s.heading}</h2>
					<div class="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
					{#each data.intents as it (it.id)}
						<div class="flex flex-col p-6">
							<span class="mb-3 flex size-11 items-center justify-center rounded-2xl bg-accent-100 text-accent-700"><Icon name={it.icon || 'sparkles'} size={22} /></span>
							<h3 class="font-heading text-lg">{it.title}</h3>
							{#if it.description}<p class="mt-1.5 text-sm leading-relaxed text-muted">{it.description}</p>{/if}
							{#if it.links?.length}
								<ul class="mt-auto space-y-1 pt-4">
									{#each it.links as link (link.href + link.label)}
										<li><a href={link.href} class="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">{link.label} <Icon name="arrow-right" size={14} /></a></li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
					</div>
				</div>
			</div>
		</section>
	{:else if s.id === 'services' && data.serviceGroups.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-services">
			<div class="container-page">
				<div class="flex flex-wrap items-end justify-between gap-4">
					{@render heading(s)}
					<a href="/services" class="btn-outline mb-10">All {l.services.toLowerCase()}</a>
				</div>
				<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.serviceGroups.flatMap((g) => g.items).slice(0, 8) as svc (svc.id)}<li><ServiceCard service={svc} /></li>{/each}
				</ul>
				{#if data.serviceGroups.length > 1}
					<ul class="mt-8 flex flex-wrap gap-2" aria-label="Browse by category">
						{#each data.serviceGroups as g (g.category)}
							<li><a href="/services#{slugify(g.category)}" class="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary-700">{g.category}</a></li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{:else if s.id === 'process' && data.process.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-process">
			<div class="container-page grid items-center gap-12 lg:grid-cols-2">
				<div>
					{@render heading(s)}
					<ol class="space-y-6">
						{#each data.process as step, i (step.id)}
							<li class="flex gap-5">
								<span class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 font-heading text-lg text-primary-800">{i + 1}</span>
								<div>
									<h3 class="font-heading text-xl">{step.title}</h3>
									{#if step.description}<p class="mt-1 leading-relaxed text-muted">{step.description}</p>{/if}
								</div>
							</li>
						{/each}
					</ol>
				</div>
				{#if s.image}
					<div class="overflow-hidden rounded-brand">
						<img src={s.image.url} alt={s.image.alt} width={s.image.width ?? 1200} height={s.image.height ?? 900} loading="lazy" decoding="async" class="aspect-[4/3] w-full object-cover" />
					</div>
				{/if}
			</div>
		</section>
	{:else if s.id === 'doctors' && data.doctors.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-doctors">
			<div class="container-page">
				<div class="flex flex-wrap items-end justify-between gap-4">
					{@render heading(s)}
					<a href="/doctors" class="btn-outline mb-10">Meet all {l.doctors.toLowerCase()}</a>
				</div>
				<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.doctors as d (d.id)}<li><DoctorCard doctor={d} booking={site.modules.booking} bookLabel="Book" /></li>{/each}
				</ul>
			</div>
		</section>
	{:else if s.id === 'locations' && data.locations.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-locations">
			<div class="container-page">
				{@render heading(s)}
				<ul class="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each data.locations as loc (loc.id)}<li><LocationCard location={loc} timeZone={tz} {locale} booking={site.modules.booking} /></li>{/each}
				</ul>
				<MapTabs locations={data.locations} />
			</div>
		</section>
	{:else if s.id === 'certifications' && data.certifications.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-certifications">
			<div class="container-page">
				{@render heading(s, 'center')}
				<ul class="flex flex-wrap items-stretch justify-center gap-4">
					{#each data.certifications as c (c.id)}
						<li class="card flex w-40 flex-col items-center p-4 text-center sm:w-48">
							{#if c.image}<img src={c.image.url} alt={c.image.alt} width="160" height="160" loading="lazy" class="mb-3 size-24 object-contain" />{/if}
							<p class="text-sm font-semibold">{c.title}</p>
							{#if c.issuer}<p class="mt-0.5 text-xs text-muted">{c.issuer}{c.year ? ` · ${c.year}` : ''}</p>{/if}
						</li>
					{/each}
				</ul>
				<p class="mt-8 text-center"><a href="/certifications" class="link">See all {l.certifications.toLowerCase()}</a></p>
			</div>
		</section>
	{:else if (s.id === 'technology' && data.technology.length) || (s.id === 'insurance' && data.insurance.length)}
		{@const items = s.id === 'technology' ? data.technology : data.insurance}
		<section id={s.id} class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-{s.id}">
			<div class="container-page">
				{@render heading(s)}
				<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each items as t (t.id)}
						<li class="flex gap-4">
							<span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-800"><Icon name={t.icon || 'sparkles'} size={24} /></span>
							<div><h3 class="font-heading text-lg">{t.title}</h3>{#if t.description}<p class="mt-1 text-sm leading-relaxed text-muted">{t.description}</p>{/if}</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{:else if s.id === 'amenities' && data.amenities.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-amenities">
			<div class="container-page">
				{@render heading(s, 'center')}
				<ul class="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
					{#each data.amenities as a (a.id)}
						<li class="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium"><Icon name={a.icon || 'check'} size={18} class="text-primary-700" /> {a.title}</li>
					{/each}
				</ul>
			</div>
		</section>
	{:else if s.id === 'testimonials' && data.testimonials.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-testimonials">
			<div class="container-page">
				<div class="flex flex-wrap items-end justify-between gap-4">
					{@render heading(s)}
					{#if site.clinic.googleReviewsUrl}<a href={site.clinic.googleReviewsUrl} target="_blank" rel="noopener" class="btn-outline mb-10"><Icon name="google" size={18} /> Read our Google reviews</a>{/if}
				</div>
				<ul class="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
					{#each data.testimonials as t (t.id)}
						<li class="card flex w-[85%] shrink-0 snap-start flex-col p-6 md:w-auto">
							<Stars rating={t.rating ?? 5} />
							<blockquote class="mt-3 flex-1 leading-relaxed text-ink">“{t.text}”</blockquote>
							<p class="mt-4 text-sm">
								<span class="font-semibold">{t.name}</span>
								<span class="text-muted">{[t.source, t.date ? dateFmt(t.date) : ''].filter(Boolean).join(' · ')}</span>
							</p>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{:else if s.id === 'membership' && data.membership.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-membership">
			<div class="container-page">
				{@render heading(s, 'center')}
				<ul class="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
					{#each data.membership as p (p.id)}
						<li class="card flex flex-col p-7 {p.highlighted ? 'border-primary ring-2 ring-primary' : ''}">
							<h3 class="font-heading text-2xl">{p.name}</h3>
							{#if p.price}<p class="mt-2"><span class="font-heading text-3xl">{p.price}</span> <span class="text-muted">{p.period}</span></p>{/if}
							{#if p.description}<p class="mt-2 text-muted">{p.description}</p>{/if}
							<ul class="mt-5 space-y-2">
								{#each p.features ?? [] as f (f)}<li class="flex gap-2 text-sm"><Icon name="check" size={18} class="text-primary-700" /> {f}</li>{/each}
							</ul>
							{#if p.ctaText && p.ctaLink}<a href={p.ctaLink} class="mt-6 {p.highlighted ? 'btn-primary' : 'btn-outline'}">{p.ctaText}</a>{/if}
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{:else if s.id === 'faq' && data.faqs.length}
		<section class="section {tinted.has(s.id) ? 'bg-surface-2' : ''} {i > 2 ? 'cv-auto' : ''}" aria-labelledby="h-faq">
			<div class="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
				<div>
					{@render heading(s)}
					<p class="text-muted">Can't find what you are looking for? <a href="/contact" class="link">Get in touch</a>.</p>
				</div>
				<FaqList items={data.faqs} />
			</div>
		</section>
	{:else if s.id === 'cta'}
		<section class="section" aria-labelledby="h-cta">
			<div class="container-page">
				<div class="relative overflow-hidden rounded-brand bg-primary-800 px-6 py-14 text-center text-white sm:px-12">
					<div class="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/5" aria-hidden="true"></div>
					<div class="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-accent/20" aria-hidden="true"></div>
					<h2 id="h-cta" class="relative text-3xl text-white sm:text-4xl">{s.heading}</h2>
					{#if s.intro}<p class="relative mx-auto mt-4 max-w-xl text-lg text-white/85">{s.intro}</p>{/if}
					<div class="relative mt-8 flex flex-wrap justify-center gap-3">
						{#if site.modules.booking}<a href="/book" class="btn-light px-6"><Icon name="calendar-check" size={18} /> {l.bookCta}</a>{/if}
						{#if phone}<a href={telLink(phone)} class="btn border border-white/50 px-6 text-white hover:bg-white/10"><Icon name="phone" size={18} /> {phone}</a>{/if}
					</div>
				</div>
			</div>
		</section>
	{/if}
{/each}
