<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import OpenStatus from '#lib/components/site/OpenStatus.svelte';
	import HoursTable from '#lib/components/site/HoursTable.svelte';
	import DoctorCard from '#lib/components/site/DoctorCard.svelte';
	import { telLink, whatsappLink, fullAddress } from '#lib/format.js';
	import { bookHref } from '#lib/links.js';
	import { locationLd, breadcrumbLd } from '#lib/seo.js';
	import { isAllowedEmbedUrl } from '#lib/maps.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const loc = $derived(data.location);
	const site = $derived(data.site);
	const l = $derived(site.labels);
	const origin = $derived(page.url.origin);
	const fmtDate = (ymd: string) => new Intl.DateTimeFormat(site.clinic.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ymd));
	let photoIndex = $state(0);
</script>

<Seo
	title={loc.seo?.title || `${site.clinic.name} ${loc.name}`}
	description={loc.seo?.description || loc.summary || `${site.clinic.name} at ${fullAddress(loc)}. Opening hours, ${l.doctors.toLowerCase()} and directions.`}
	image={loc.seo?.ogImage || loc.photos[0]?.url}
	jsonLd={[locationLd(loc, site.clinic, origin), breadcrumbLd([{ name: l.locations, url: '/locations' }, { name: loc.name, url: `/locations/${loc.slug}` }], origin)]}
/>

<section class="bg-surface-2">
	<div class="container-page grid gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
		<div>
			<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted">
				<ol class="flex gap-1.5"><li><a href="/" class="hover:text-ink">Home</a></li><li aria-hidden="true">/</li><li><a href="/locations" class="hover:text-ink">{l.locations}</a></li></ol>
			</nav>
			<p class="eyebrow mb-3">{loc.type}</p>
			<h1 class="text-4xl sm:text-5xl">{site.clinic.shortName || site.clinic.name}, {loc.name}</h1>
			<div class="mt-4"><OpenStatus hours={loc.hours} closures={loc.closures} timeZone={site.clinic.timeZone} locale={site.clinic.locale} /></div>
			{#if loc.summary}<p class="lead mt-4">{loc.summary}</p>{/if}
			<div class="mt-7 flex flex-wrap gap-3">
				{#if site.modules.booking}<a href={bookHref({ location: loc.slug })} class="btn-primary"><Icon name="calendar-check" size={18} /> {l.bookCta}</a>{/if}
				{#if loc.directionsUrl}<a href={loc.directionsUrl} target="_blank" rel="noopener" class="btn-outline"><Icon name="navigation" size={18} /> Get directions</a>{/if}
				{#if loc.phones[0]}<a href={telLink(loc.phones[0])} class="btn-outline"><Icon name="phone" size={18} /> Call</a>{/if}
				{#if loc.whatsapp}<a href={whatsappLink(loc.whatsapp)} target="_blank" rel="noopener" class="btn-outline"><Icon name="whatsapp" size={18} /> WhatsApp</a>{/if}
			</div>
		</div>
		{#if loc.photos.length}
			{@const p = loc.photos[photoIndex] ?? loc.photos[0]}
			<div>
				<img src={p.url} alt={p.alt} width={p.width ?? 1200} height={p.height ?? 800} class="aspect-[3/2] w-full rounded-brand object-cover" />
				{#if loc.photos.length > 1}
					<ul class="mt-3 flex gap-2 overflow-x-auto">
						{#each loc.photos as ph, i (ph.url + i)}
							<li>
								<button type="button" class="block overflow-hidden rounded-lg border-2 {i === photoIndex ? 'border-primary' : 'border-transparent'}" aria-label="Show photo {i + 1}: {ph.alt}" aria-pressed={i === photoIndex} onclick={() => (photoIndex = i)}>
									<img src={ph.url} alt="" width="96" height="64" loading="lazy" class="h-16 w-24 object-cover" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</section>

<div class="container-page grid gap-10 py-14 lg:grid-cols-[1fr_24rem]">
	<div class="min-w-0 space-y-10">
		{#if isAllowedEmbedUrl(loc.mapEmbedUrl)}
			<section aria-labelledby="map-h">
				<h2 id="map-h" class="mb-4 text-2xl">Map</h2>
				<iframe title="Map of {loc.name}" src={loc.mapEmbedUrl} class="h-96 w-full rounded-brand border border-line" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
			</section>
		{/if}
		{#if loc.description}
			<section aria-labelledby="about-loc">
				<h2 id="about-loc" class="mb-4 text-2xl">About this {l.location.toLowerCase()}</h2>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
				<div class="prose-clinic">{@html loc.description}</div>
			</section>
		{/if}
		{#if data.services.length && site.modules.services}
			<section aria-labelledby="svc-h">
				<h2 id="svc-h" class="mb-4 text-2xl">{l.services} here</h2>
				<ul class="flex flex-wrap gap-2">
					{#each data.services as s (s.id)}
						<li><a href="/services/{s.slug}" class="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-primary"><Icon name={s.icon ?? 'sparkles'} size={16} class="text-primary-700" /> {s.name}</a></li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<div class="card p-6">
			<h2 class="mb-4 text-xl">Contact</h2>
			<dl class="space-y-3 text-sm">
				<div class="flex gap-3"><dt><Icon name="map-pin" size={18} class="text-primary-700" /><span class="sr-only">Address</span></dt><dd>{fullAddress(loc)}</dd></div>
				{#each loc.phones as p (p)}<div class="flex gap-3"><dt><Icon name="phone" size={18} class="text-primary-700" /><span class="sr-only">Phone</span></dt><dd><a href={telLink(p)} class="hover:underline">{p}</a></dd></div>{/each}
				{#if loc.whatsapp}<div class="flex gap-3"><dt><Icon name="whatsapp" size={18} class="text-primary-700" /><span class="sr-only">WhatsApp</span></dt><dd><a href={whatsappLink(loc.whatsapp)} target="_blank" rel="noopener" class="hover:underline">{loc.whatsapp}</a></dd></div>{/if}
				{#if loc.email}<div class="flex gap-3"><dt><Icon name="mail" size={18} class="text-primary-700" /><span class="sr-only">Email</span></dt><dd><a href="mailto:{loc.email}" class="break-all hover:underline">{loc.email}</a></dd></div>{/if}
			</dl>
		</div>
		<div class="card p-6">
			<h2 class="mb-2 text-xl">Opening hours</h2>
			<HoursTable hours={loc.hours} timeZone={site.clinic.timeZone} locale={site.clinic.locale} />
			{#if loc.closures.length}
				<div class="mt-4 rounded-lg bg-accent-100 p-3 text-sm">
					<p class="font-semibold">Upcoming closures</p>
					<ul>{#each loc.closures as c (c.startDate)}<li>{c.startDate === c.endDate ? fmtDate(c.startDate) : `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`}{c.reason ? ` · ${c.reason}` : ''}</li>{/each}</ul>
				</div>
			{/if}
		</div>
	</aside>
</div>

{#if data.doctors.length && site.modules.doctors}
	<section class="bg-surface-2 py-14" aria-labelledby="docs-h">
		<div class="container-page">
			<h2 id="docs-h" class="mb-6 text-2xl">{l.doctors} at {loc.name}</h2>
			<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.doctors as d (d.id)}<li><DoctorCard doctor={d} booking={site.modules.booking && d.bookable} locationSlug={loc.slug} /></li>{/each}
			</ul>
		</div>
	</section>
{/if}

{#if data.others.length}
	<section class="py-12" aria-labelledby="other-h">
		<div class="container-page">
			<h2 id="other-h" class="mb-4 text-xl">Other {l.locations.toLowerCase()}</h2>
			<ul class="flex flex-wrap gap-2">{#each data.others as o (o.id)}<li><a href="/locations/{o.slug}" class="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-primary">{o.name}</a></li>{/each}</ul>
		</div>
	</section>
{/if}
