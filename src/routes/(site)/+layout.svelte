<script lang="ts">
	import SiteHeader from '#lib/components/site/SiteHeader.svelte';
	import SiteFooter from '#lib/components/site/SiteFooter.svelte';
	import MobileBar from '#lib/components/site/MobileBar.svelte';
	import NoticeBanner from '#lib/components/site/NoticeBanner.svelte';
	import Analytics from '#lib/components/site/Analytics.svelte';
	import ChatWidget from '#lib/components/site/ChatWidget.svelte';
	import { textScale } from '#lib/theme.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const site = $derived(data.site);
	const phone = $derived(site.clinic.phones[0] ?? data.nav.locations[0]?.phones[0]);
	// Value comes from a fixed map in textScale(), so it is safe to inline.
	const textCss = $derived(`<style>html{font-size:${textScale(site.theme)}}</style>`);
	const whatsapp = $derived(site.clinic.whatsapp || data.nav.locations[0]?.whatsapp || undefined);
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html textCss}
</svelte:head>

<a href="#main" class="skip-link">Skip to content</a>

{#if site.modules.banner && site.banner.text}
	<NoticeBanner {...site.banner} />
{/if}

<SiteHeader {site} nav={data.nav} />

<main id="main" tabindex="-1" class="outline-none">
	{@render children()}
</main>

<SiteFooter {site} nav={data.nav} />

<!-- Spacer so the mobile bar never covers content; also used to lift the chat button. -->
<div class="h-16 bg-secondary lg:hidden" aria-hidden="true"></div>
<MobileBar {phone} {whatsapp} booking={site.modules.booking} bookLabel={site.labels.bookCta} />

{#if site.analytics.ga4Id}<Analytics id={site.analytics.ga4Id} />{/if}
{#if site.chatbot.provider !== 'none'}<ChatWidget config={site.chatbot} scripts={data.chatScripts} />{/if}
