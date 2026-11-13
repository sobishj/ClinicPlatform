<script lang="ts">
	import '../app.css';
	import { themeCss, googleFontsUrl } from '#lib/theme.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const theme = $derived(data.site.theme);
	const css = $derived(`<style>:root{${themeCss(theme)}}</style>`);
	const favicon = $derived(data.site.clinic.favicon?.url ?? data.site.clinic.logo?.url ?? '/favicon.svg');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href={googleFontsUrl(theme)} />
	<meta name="theme-color" content={theme.primary} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- values validated in themeCss -->
	{@html css}
</svelte:head>

{@render children()}
