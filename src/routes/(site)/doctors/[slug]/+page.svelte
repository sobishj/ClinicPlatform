<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import DoctorCard from '#lib/components/site/DoctorCard.svelte';
	import { bookHref, doctorName } from '#lib/links.js';
	import { physicianLd, breadcrumbLd } from '#lib/seo.js';
	import { WEEKDAYS, WEEKDAY_LABELS } from '#lib/types.js';
	import { formatRanges } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const d = $derived(data.doctor);
	const site = $derived(data.site);
	const l = $derived(site.labels);
	const name = $derived(doctorName(d));
	const photo = $derived(d.photoPortrait ?? d.photo);
	const origin = $derived(page.url.origin);
	const fmtDate = (ymd: string) => new Intl.DateTimeFormat(site.clinic.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ymd));
</script>

<Seo
	title={d.seo?.title || `${name}${d.specialities[0] ? ', ' + d.specialities[0] : ''}`}
	description={d.seo?.description || d.summary || `${name}, ${d.qualifications ?? ''} at ${site.clinic.name}.`}
	image={d.seo?.ogImage || photo?.url}
	type="profile"
	jsonLd={[physicianLd(d, d.branches, origin), breadcrumbLd([{ name: l.doctors, url: '/doctors' }, { name, url: `/doctors/${d.slug}` }], origin)]}
/>

<section class="bg-surface-2">
	<div class="container-page grid gap-10 py-12 md:grid-cols-[minmax(0,22rem)_1fr] md:items-center md:py-16">
		<div class="overflow-hidden rounded-brand bg-white">
			{#if photo}<img src={photo.url} alt={photo.alt} width={photo.width ?? 800} height={photo.height ?? 1000} class="aspect-[4/5] w-full object-cover" />{/if}
		</div>
		<div>
			<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted">
				<ol class="flex gap-1.5"><li><a href="/" class="hover:text-ink">Home</a></li><li aria-hidden="true">/</li><li><a href="/doctors" class="hover:text-ink">{l.doctors}</a></li></ol>
			</nav>
			{#if d.specialities.length}<p class="eyebrow mb-3">{d.specialities.join(' · ')}</p>{/if}
			<h1 class="text-4xl sm:text-5xl">{name}</h1>
			{#if d.qualifications}<p class="mt-2 text-lg text-muted">{d.qualifications}</p>{/if}
			{#if d.summary}<p class="lead mt-5 max-w-xl">{d.summary}</p>{/if}
			<dl class="mt-6 grid max-w-xl gap-4 sm:grid-cols-3">
				{#if d.experienceYears}
					<div class="card p-4"><dt class="text-xs text-muted uppercase">Experience</dt><dd class="font-heading text-2xl">{d.experienceYears}+ yrs</dd></div>
				{/if}
				{#if d.languages.length}
					<div class="card p-4 sm:col-span-2"><dt class="text-xs text-muted uppercase">Languages</dt><dd class="mt-1 font-medium">{d.languages.join(', ')}</dd></div>
				{/if}
			</dl>
			{#if site.modules.booking}
				<div class="mt-7 flex flex-wrap gap-3">
					<a href={bookHref({ doctor: d.slug })} class="btn-primary"><Icon name="calendar-check" size={18} /> Book with {name}</a>
				</div>
			{/if}
			{#if d.registrationNumber}<p class="mt-4 text-sm text-muted">Registration no. {d.registrationNumber}</p>{/if}
		</div>
	</div>
</section>

<div class="container-page grid gap-12 py-14 lg:grid-cols-[1fr_24rem]">
	<div class="min-w-0 space-y-12">
		{#if d.bio}
			<section aria-labelledby="about-doc">
				<h2 id="about-doc" class="mb-4 text-2xl">About {d.title ? `${d.title} ${d.name.split(' ')[0]}` : d.name}</h2>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
				<div class="prose-clinic prose-lg">{@html d.bio}</div>
			</section>
		{/if}
		{#if data.services.length && site.modules.services}
			<section aria-labelledby="svc">
				<h2 id="svc" class="mb-4 text-2xl">{l.services}</h2>
				<ul class="flex flex-wrap gap-2">
					{#each data.services as s (s.id)}
						<li><a href="/services/{s.slug}" class="inline-flex items-center gap-2 chip-lift rounded-full border border-line bg-card px-4 py-2 text-sm hover:text-primary-700"><Icon name={s.icon ?? 'sparkles'} size={16} class="text-primary-700" /> {s.name}</a></li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<aside aria-labelledby="where" class="space-y-4">
		<h2 id="where" class="text-2xl">Where to find {d.title ? `${d.title} ${d.name.split(' ')[0]}` : d.name}</h2>
		{#each d.branches as b (b.locationId)}
			<div class="card p-5">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-lg"><a href="/locations/{b.slug}" class="hover:text-primary-700">{b.name}</a></h3>
					{#if site.modules.booking && b.bookable}<a href={bookHref({ doctor: d.slug, location: b.slug })} class="btn-primary btn-sm">Book<span class="sr-only"> at {b.name}</span></a>{/if}
				</div>
				<table class="mt-3 w-full text-sm">
					<caption class="sr-only">Days and times at {b.name}</caption>
					<tbody>
						{#each WEEKDAYS.filter((w) => b.schedule[w]?.length) as w (w)}
							<tr><th scope="row" class="py-1 pr-3 text-left font-medium">{WEEKDAY_LABELS[w]}</th><td class="py-1 text-right text-muted">{formatRanges(b.schedule[w], site.clinic.locale)}</td></tr>
						{:else}
							<tr><td class="py-1 text-muted">By appointment — please call the branch.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
		{#if data.leaves.length}
			<p class="rounded-brand bg-accent-100 p-4 text-sm">
				<strong>Away:</strong>
				{data.leaves.map((lv) => (lv.startDate === lv.endDate ? fmtDate(lv.startDate) : `${fmtDate(lv.startDate)} – ${fmtDate(lv.endDate)}`)).join(', ')}
			</p>
		{/if}
	</aside>
</div>

{#if data.others.length}
	<section class="bg-surface-2 py-14" aria-labelledby="others">
		<div class="container-page">
			<h2 id="others" class="mb-6 text-2xl">Other {l.doctors.toLowerCase()}</h2>
			<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{#each data.others as o (o.id)}<li><DoctorCard doctor={o} booking={site.modules.booking} /></li>{/each}</ul>
		</div>
	</section>
{/if}
