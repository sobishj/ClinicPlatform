<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { themeCss, googleFontsUrl } from '#lib/theme.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const theme = $derived(data.site.theme);
	// `html:root` outranks the defaults in app.css regardless of stylesheet order.
	const css = $derived(`<style>html:root{${themeCss(theme)}}</style>`);
	const favicon = $derived(data.site.clinic.favicon?.url ?? data.site.clinic.logo?.url ?? '/favicon.svg');
	const fontsUrl = $derived(googleFontsUrl(theme));

	// Web fonts are preloaded but applied after hydration so they never block first paint
	// (system fonts show first; font-display: swap does the rest).
	let fontsReady = $state(false);
	onMount(() => (fontsReady = true));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="preload" as="style" href={fontsUrl} />
	{#if fontsReady}<link rel="stylesheet" href={fontsUrl} />{/if}
	<noscript><link rel="stylesheet" href={fontsUrl} /></noscript>
	<meta name="theme-color" content={theme.primary} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- values validated in themeCss -->
	{@html css}
</svelte:head>

{@render children()}
