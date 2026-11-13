<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import LocationCard from '#lib/components/site/LocationCard.svelte';
	import MapTabs from '#lib/components/site/MapTabs.svelte';
	import { locationLd } from '#lib/seo.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const l = $derived(site.labels);
</script>

<Seo
	title="Our {l.locations.toLowerCase()}"
	description="{site.clinic.name} {l.locations.toLowerCase()}: {data.locations.map((x) => x.name).join(', ')}. Addresses, opening hours, phone numbers and directions."
	jsonLd={data.locations.map((loc) => locationLd(loc, site.clinic, page.url.origin))}
/>

<PageHero title="Find a {l.location.toLowerCase()} near you" eyebrow="Visit us" intro="Addresses, opening hours and directions for every branch." />

<div class="container-page space-y-12 py-12">
	<ul class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each data.locations as loc (loc.id)}<li><LocationCard location={loc} timeZone={site.clinic.timeZone} locale={site.clinic.locale} booking={site.modules.booking} headingLevel="h2" /></li>{/each}
	</ul>
	<MapTabs locations={data.locations} />
</div>
