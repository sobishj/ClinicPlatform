<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { telLink, whatsappLink } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const loc = $derived(data.location);
	let heading: HTMLHeadingElement | undefined = $state();
	$effect(() => heading?.focus());
</script>

<svelte:head>
	<title>Request received · {site.clinic.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="container-page max-w-2xl py-14 sm:py-20">
	<div class="card overflow-hidden">
		<div class="bg-primary-800 px-6 py-8 text-white sm:px-8">
			<span class="mb-4 flex size-12 items-center justify-center rounded-full bg-white/15"><Icon name="check" size={26} /></span>
			<h1 bind:this={heading} tabindex="-1" class="text-3xl text-white outline-none">{site.booking.thankYouHeading}</h1>
			<p class="mt-3 text-white/90">{data.isSlot ? 'Your time is reserved. We look forward to seeing you.' : site.booking.thankYouMessage}</p>
		</div>
		<dl class="divide-y divide-line px-6 sm:px-8">
			<div class="flex justify-between gap-4 py-4"><dt class="text-muted">Reference</dt><dd class="font-mono text-lg font-semibold">{data.reference}</dd></div>
			<div class="flex justify-between gap-4 py-4"><dt class="text-muted">Branch</dt><dd class="text-right font-medium">{loc.name}<span class="block text-sm font-normal text-muted">{loc.address}</span></dd></div>
			{#if data.doctor}<div class="flex justify-between gap-4 py-4"><dt class="text-muted">{site.labels.doctor}</dt><dd class="font-medium">{data.doctor}</dd></div>{/if}
			<div class="flex justify-between gap-4 py-4"><dt class="text-muted">{data.isSlot ? 'Time' : 'Preferred'}</dt><dd class="text-right font-medium">{data.when}</dd></div>
		</dl>
		<div class="flex flex-wrap gap-3 border-t border-line bg-surface-2 px-6 py-5 sm:px-8">
			{#if loc.phones[0]}<a href={telLink(loc.phones[0])} class="btn-primary"><Icon name="phone" size={18} /> Call {loc.name}</a>{/if}
			{#if loc.whatsapp}<a href={whatsappLink(loc.whatsapp, `Hello, my appointment reference is ${data.reference}.`)} target="_blank" rel="noopener" class="btn-outline"><Icon name="whatsapp" size={18} /> WhatsApp</a>{/if}
			{#if loc.directionsUrl}<a href={loc.directionsUrl} target="_blank" rel="noopener" class="btn-outline"><Icon name="navigation" size={18} /> Directions</a>{/if}
			{#if data.isSlot}<a href="/book/ics?ref={encodeURIComponent(data.reference)}" class="btn-outline" download><Icon name="calendar" size={18} /> Add to calendar</a>{/if}
		</div>
	</div>
	<p class="mt-8 text-center"><a href="/" class="link">Back to the website</a></p>
</section>
