<script lang="ts">
	import Icon from '../Icon.svelte';
	import { bookHref, doctorName } from '#lib/links.js';
	import type { ImageRef } from '#lib/types.js';

	interface Props {
		doctor: {
			slug: string;
			title: string | null;
			name: string;
			photo: ImageRef | null;
			qualifications: string | null;
			specialities: string[];
			experienceYears?: number | null;
			branches?: Array<{ name: string; slug: string }>;
		};
		booking?: boolean;
		bookLabel?: string;
		/** Pre-select this location in the booking link. */
		locationSlug?: string;
		headingLevel?: 'h2' | 'h3';
	}
	let { doctor, booking = true, bookLabel = 'Book', locationSlug, headingLevel = 'h3' }: Props = $props();
	const name = $derived(doctorName(doctor));
</script>

<article class="group card flex h-full flex-col overflow-hidden">
	<a href="/doctors/{doctor.slug}" class="block aspect-square overflow-hidden bg-surface-2" tabindex="-1" aria-hidden="true">
		{#if doctor.photo?.url}
			<img src={doctor.photo.url} alt="" width={doctor.photo.width ?? 800} height={doctor.photo.height ?? 800} loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
		{/if}
	</a>
	<div class="flex flex-1 flex-col p-5">
		<svelte:element this={headingLevel} class="font-heading text-xl">
			<a href="/doctors/{doctor.slug}" class="hover:text-primary-700">{name}</a>
		</svelte:element>
		{#if doctor.qualifications}<p class="mt-1 text-sm text-muted">{doctor.qualifications}</p>{/if}
		{#if doctor.specialities.length}<p class="mt-2 text-sm font-medium text-primary-800">{doctor.specialities.slice(0, 2).join(' · ')}</p>{/if}
		{#if doctor.branches?.length}
			<p class="mt-2 flex items-start gap-1.5 text-sm text-muted"><Icon name="map-pin" size={16} class="mt-0.5 shrink-0" /> {doctor.branches.map((b) => b.name).join(', ')}</p>
		{/if}
		<div class="mt-auto flex flex-wrap gap-2 pt-5">
			<a href="/doctors/{doctor.slug}" class="btn-outline btn-sm">View profile<span class="sr-only"> of {name}</span></a>
			{#if booking}
				<a href={bookHref({ doctor: doctor.slug, location: locationSlug })} class="btn-primary btn-sm">{bookLabel}<span class="sr-only"> with {name}</span></a>
			{/if}
		</div>
	</div>
</article>
