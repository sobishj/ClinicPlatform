<script lang="ts">
	import Icon from '../Icon.svelte';
	import OpenStatus from './OpenStatus.svelte';
	import { telLink, fullAddress } from '#lib/format.js';
	import { summariseHours, type DateRange } from '#lib/time.js';
	import { bookHref } from '#lib/links.js';
	import type { ImageRef, WeeklyHours } from '#lib/types.js';

	interface Props {
		location: {
			slug: string;
			name: string;
			type: string;
			addressLine1: string;
			addressLine2?: string | null;
			area?: string | null;
			city: string;
			state?: string | null;
			postalCode?: string | null;
			phones: string[];
			email?: string | null;
			hours: WeeklyHours;
			closures?: DateRange[];
			photos?: ImageRef[];
			directionsUrl?: string | null;
			summary?: string | null;
		};
		timeZone: string;
		locale?: string;
		booking?: boolean;
		headingLevel?: 'h2' | 'h3';
	}
	let { location: l, timeZone, locale = 'en-IN', booking = true, headingLevel = 'h3' }: Props = $props();
	const photo = $derived(l.photos?.[0]);
</script>

<article class="group card card-lift flex h-full flex-col overflow-hidden">
	<div class="relative aspect-[16/10] overflow-hidden bg-surface-2">
		{#if photo}
			<img src={photo.url} alt={photo.alt} width={photo.width ?? 1200} height={photo.height ?? 800} loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
		{/if}
		<span class="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary-800 shadow-sm">{l.type}</span>
	</div>
	<div class="flex flex-1 flex-col p-5">
		<svelte:element this={headingLevel} class="font-heading text-xl"><a href="/locations/{l.slug}" class="hover:text-primary-700">{l.name}</a></svelte:element>
		<div class="mt-1"><OpenStatus hours={l.hours} closures={l.closures} {timeZone} {locale} /></div>
		<dl class="mt-4 space-y-2.5 text-sm">
			<div class="flex gap-2"><dt><Icon name="map-pin" size={16} class="mt-0.5 text-primary-700" /><span class="sr-only">Address</span></dt><dd>{fullAddress(l)}</dd></div>
			{#if l.phones.length}
				<div class="flex gap-2">
					<dt><Icon name="phone" size={16} class="mt-0.5 text-primary-700" /><span class="sr-only">Phone</span></dt>
					<dd class="flex flex-wrap gap-x-3">{#each l.phones as p (p)}<a href={telLink(p)} class="hover:underline">{p}</a>{/each}</dd>
				</div>
			{/if}
			{#if l.email}
				<div class="flex gap-2"><dt><Icon name="mail" size={16} class="mt-0.5 text-primary-700" /><span class="sr-only">Email</span></dt><dd><a href="mailto:{l.email}" class="break-all hover:underline">{l.email}</a></dd></div>
			{/if}
			<div class="flex gap-2">
				<dt><Icon name="clock" size={16} class="mt-0.5 text-primary-700" /><span class="sr-only">Hours</span></dt>
				<dd>
					<ul>{#each summariseHours(l.hours, locale) as h (h.days)}<li><span class="text-muted">{h.days}</span> {h.hours}</li>{/each}</ul>
				</dd>
			</div>
		</dl>
		<div class="mt-auto flex flex-wrap gap-2 pt-5">
			{#if l.directionsUrl}
				<a href={l.directionsUrl} target="_blank" rel="noopener" class="btn-outline btn-sm"><Icon name="navigation" size={16} /> Directions<span class="sr-only"> to {l.name} (opens Google Maps)</span></a>
			{/if}
			{#if booking}<a href={bookHref({ location: l.slug })} class="btn-primary btn-sm">Book here<span class="sr-only"> at {l.name}</span></a>{/if}
		</div>
	</div>
</article>
