<script lang="ts">
	import Icon from '../Icon.svelte';
	import SocialLinks from './SocialLinks.svelte';
	import { telLink, fullAddress } from '#lib/format.js';
	import { summariseHours } from '#lib/time.js';
	import type { PublicSettings } from '#lib/server/settings.js';
	import type { NavData } from '#lib/server/queries.js';

	interface Props {
		site: PublicSettings;
		nav: NavData;
	}
	let { site, nav }: Props = $props();
	const m = $derived(site.modules);
	const l = $derived(site.labels);
	const year = new Date().getFullYear();
	const logo = $derived(site.clinic.logoDark ?? site.clinic.logo);

	const quick = $derived(
		[
			{ href: '/about', label: 'About us', show: true },
			{ href: '/services', label: l.services, show: m.services },
			{ href: '/doctors', label: l.doctors, show: m.doctors },
			{ href: '/locations', label: l.locations, show: m.locations },
			{ href: '/certifications', label: l.certifications, show: m.certifications },
			{ href: '/gallery', label: 'Gallery', show: m.gallery },
			{ href: '/blog', label: 'Articles', show: m.blog },
			{ href: '/contact', label: 'Contact', show: true },
			{ href: '/book', label: l.bookCta, show: m.booking }
		].filter((x) => x.show)
	);
</script>

<footer class="bg-secondary text-white/80">
	<div class="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
		<div class="lg:col-span-4">
			<a href="/" class="inline-flex items-center gap-2.5">
				{#if logo?.url}<img src={logo.url} alt="" class="h-10 w-auto max-w-40 object-contain {site.clinic.logoDark ? '' : 'rounded-lg bg-white p-1'}" loading="lazy" />{/if}
				<span class="font-heading text-xl font-semibold text-white">{site.clinic.name}</span>
			</a>
			{#if site.clinic.tagline}<p class="mt-3 max-w-xs">{site.clinic.tagline}</p>{/if}
			<SocialLinks social={site.clinic.social} size={24} class="mt-4 -ml-1" />
		</div>

		<nav class="lg:col-span-2" aria-label="Footer">
			<h2 class="mb-3 font-sans text-sm font-semibold tracking-wider text-white uppercase">Explore</h2>
			<ul class="space-y-2 text-sm">
				{#each quick as q (q.href)}<li><a href={q.href} class="hover:text-white hover:underline">{q.label}</a></li>{/each}
			</ul>
		</nav>

		{#if m.services && nav.services.length}
			<div class="lg:col-span-2">
				<h2 class="mb-3 font-sans text-sm font-semibold tracking-wider text-white uppercase">{l.services}</h2>
				<ul class="space-y-2 text-sm">
					{#each nav.services.slice(0, 8) as s (s.slug)}<li><a href="/services/{s.slug}" class="hover:text-white hover:underline">{s.name}</a></li>{/each}
				</ul>
			</div>
		{/if}

		<div class="sm:col-span-2 lg:col-span-4">
			<h2 class="mb-3 font-sans text-sm font-semibold tracking-wider text-white uppercase">{l.locations}</h2>
			<ul class="grid gap-5 text-sm sm:grid-cols-2">
				{#each nav.locations as loc (loc.slug)}
					<li>
						<a href="/locations/{loc.slug}" class="font-semibold text-white hover:underline">{loc.name}</a>
						<p class="mt-1">{fullAddress(loc)}</p>
						{#each loc.phones.slice(0, 1) as p (p)}<a href={telLink(p)} class="mt-1 inline-flex items-center gap-1 hover:text-white"><Icon name="phone" size={14} /> {p}</a>{/each}
						<ul class="mt-1 text-white/70">
							{#each summariseHours(loc.hours, site.clinic.locale) as h (h.days)}<li>{h.days}: {h.hours}</li>{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	{#if site.disclaimer.enabled}
		<div class="border-t border-white/10">
			<p class="container-page py-4 text-xs text-white/70">
				<strong class="text-white/90">Please note:</strong>
				{site.disclaimer.text}
				{#if site.clinic.phones.length}Official numbers: {site.clinic.phones.join(', ')}{#each nav.locations as loc (loc.slug)}{#each loc.phones as p (p)}, {p}{/each}{/each}.{/if}
			</p>
		</div>
	{/if}

	<div class="border-t border-white/10">
		<div class="container-page flex flex-col gap-2 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
			<p>© {year} {site.clinic.name}. All rights reserved.</p>
			<ul class="flex flex-wrap gap-4">
				{#each nav.legal as p (p.slug)}<li><a href="/{p.slug}" class="hover:text-white hover:underline">{p.title}</a></li>{/each}
			</ul>
		</div>
	</div>
</footer>
