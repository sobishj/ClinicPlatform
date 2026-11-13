<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Seo from '#lib/components/Seo.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import DoctorCard from '#lib/components/site/DoctorCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const l = $derived(data.site.labels);

	// Filters live in the URL (shareable, work without JS via the form's GET submit).
	const location = $derived(page.url.searchParams.get('location') ?? '');
	const speciality = $derived(page.url.searchParams.get('speciality') ?? '');
	const filtered = $derived(
		data.doctors.filter(
			(d) => (!location || d.branches.some((b) => b.slug === location)) && (!speciality || d.specialities.includes(speciality))
		)
	);

	function update(key: string, value: string) {
		const u = new URL(page.url.href);
		if (value) u.searchParams.set(key, value);
		else u.searchParams.delete(key);
		goto(u.pathname + u.search, { replace: true, reset: false });
	}
</script>

<Seo title="Our {l.doctors.toLowerCase()}" description="Meet the {l.doctors.toLowerCase()} at {data.site.clinic.name}: qualifications, specialities and where they practise." />

<PageHero title="Meet our {l.doctors.toLowerCase()}" eyebrow="Our team" intro="Experienced, kind and happy to explain every step." />

<div class="container-page py-12">
	<form method="GET" class="mb-8 flex flex-wrap items-end gap-4" onsubmit={(e) => e.preventDefault()}>
		<div>
			<label for="f-loc" class="label">{l.location}</label>
			<select id="f-loc" name="location" class="input min-w-48" value={location} onchange={(e) => update('location', e.currentTarget.value)}>
				<option value="">All {l.locations.toLowerCase()}</option>
				{#each data.nav.locations as loc (loc.slug)}<option value={loc.slug}>{loc.name}</option>{/each}
			</select>
		</div>
		{#if data.specialities.length}
			<div>
				<label for="f-spec" class="label">Speciality</label>
				<select id="f-spec" name="speciality" class="input min-w-48" value={speciality} onchange={(e) => update('speciality', e.currentTarget.value)}>
					<option value="">All specialities</option>
					{#each data.specialities as sp (sp)}<option value={sp}>{sp}</option>{/each}
				</select>
			</div>
		{/if}
		<noscript><button class="btn-outline">Filter</button></noscript>
		<p class="pb-2.5 text-sm text-muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? l.doctor.toLowerCase() : l.doctors.toLowerCase()}</p>
	</form>

	{#if filtered.length}
		<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each filtered as d (d.id)}<li><DoctorCard doctor={d} booking={data.site.modules.booking} locationSlug={location || undefined} headingLevel="h2" /></li>{/each}
		</ul>
	{:else}
		<p class="card p-8 text-center text-muted">No {l.doctors.toLowerCase()} match those filters. <button class="link" onclick={() => goto('/doctors')}>Show everyone</button></p>
	{/if}
</div>
