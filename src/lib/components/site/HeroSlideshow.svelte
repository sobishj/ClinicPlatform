<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '../Icon.svelte';
	import type { ImageRef } from '#lib/types.js';

	interface Slide {
		id: string;
		image: ImageRef;
		mobileImage: ImageRef | null;
		heading: string | null;
		subheading: string | null;
		buttonText: string | null;
		buttonLink: string | null;
		align: string;
		overlay: number;
	}
	interface Props {
		slides: Slide[];
		settings: { intervalSeconds: number; transitionMs: number; pauseOnHover: boolean; showDots: boolean; showArrows: boolean };
		/** Shown when there are no slides. */
		fallback: { title: string; subtitle?: string; ctaText?: string; ctaHref?: string };
		/** Secondary call-to-action (e.g. phone). */
		secondary?: { text: string; href: string } | null;
	}
	let { slides, settings, fallback, secondary = null }: Props = $props();

	let index = $state(0);
	let userPaused = $state(false);
	let hovering = $state(false);
	let focusWithin = $state(false);
	let reducedMotion = $state(false);
	let pageHidden = $state(false);
	let hydrated = $state(false);
	/** Slide images to render (first is always loaded; others load just before they show). */
	let loaded = $state<Set<number>>(new Set([0]));
	let liveMessage = $state('');

	const count = $derived(slides.length);
	const multi = $derived(count > 1);
	const autoplay = $derived(multi && hydrated && !reducedMotion && !userPaused && !pageHidden && !(settings.pauseOnHover && (hovering || focusWithin)));

	onMount(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const onMq = () => (reducedMotion = mq.matches);
		mq.addEventListener('change', onMq);
		const onVis = () => (pageHidden = document.hidden);
		document.addEventListener('visibilitychange', onVis);
		hydrated = true;
		// Warm up the second slide once the page is idle.
		const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
		idle(() => preload(1));
		return () => {
			mq.removeEventListener('change', onMq);
			document.removeEventListener('visibilitychange', onVis);
		};
	});

	function preload(i: number) {
		if (!multi) return;
		const n = ((i % count) + count) % count;
		if (!loaded.has(n)) loaded = new Set([...loaded, n]);
	}

	function go(i: number, announce = false) {
		index = ((i % count) + count) % count;
		preload(index + 1);
		if (announce) liveMessage = `Slide ${index + 1} of ${count}${slides[index].heading ? ': ' + slides[index].heading : ''}`;
	}

	$effect(() => {
		if (!autoplay) return;
		const t = setTimeout(() => go(index + 1), settings.intervalSeconds * 1000);
		return () => clearTimeout(t);
	});

	const alignCls = (a: string) =>
		a === 'center' ? 'items-center text-center mx-auto' : a === 'right' ? 'items-end text-right ml-auto' : 'items-start text-left';
</script>

<svelte:head>
	{#if slides[0]}
		{#if slides[0].mobileImage}
			<link rel="preload" as="image" href={slides[0].mobileImage.url} media="(max-width: 767px)" fetchpriority="high" />
			<link rel="preload" as="image" href={slides[0].image.url} media="(min-width: 768px)" fetchpriority="high" />
		{:else}
			<link rel="preload" as="image" href={slides[0].image.url} fetchpriority="high" />
		{/if}
	{/if}
</svelte:head>

{#if !count}
	<section class="relative overflow-hidden bg-primary-900 text-white">
		<div class="container-page flex min-h-[28rem] flex-col justify-center py-20">
			<h1 class="max-w-3xl text-4xl leading-tight text-white sm:text-6xl">{fallback.title}</h1>
			{#if fallback.subtitle}<p class="mt-5 max-w-xl text-lg text-white/85">{fallback.subtitle}</p>{/if}
			{#if fallback.ctaText && fallback.ctaHref}<div class="mt-8"><a href={fallback.ctaHref} class="btn-light">{fallback.ctaText}</a></div>{/if}
		</div>
	</section>
{:else}
	<section
		class="relative isolate overflow-hidden bg-secondary"
		aria-roledescription={multi ? 'carousel' : undefined}
		aria-label={multi ? 'Highlights' : undefined}
		onmouseenter={() => (hovering = true)}
		onmouseleave={() => (hovering = false)}
		onfocusin={() => (focusWithin = true)}
		onfocusout={() => (focusWithin = false)}
	>
		<div class="relative h-[min(82svh,46rem)] min-h-[32rem]">
			{#each slides as s, i (s.id)}
				{@const active = i === index}
				<div
					class="absolute inset-0 transition-opacity ease-in-out {active ? 'z-10 opacity-100' : 'z-0 opacity-0'}"
					style="transition-duration: {reducedMotion ? 0 : settings.transitionMs}ms"
					role={multi ? 'group' : undefined}
					aria-roledescription={multi ? 'slide' : undefined}
					aria-label={multi ? `${i + 1} of ${count}` : undefined}
					aria-hidden={!active}
					inert={!active}
				>
					{#if loaded.has(i) || i === 0}
						<picture>
							{#if s.mobileImage}<source media="(max-width: 767px)" srcset={s.mobileImage.url} />{/if}
							<img
								src={s.image.url}
								alt={s.image.alt}
								width={s.image.width ?? 1920}
								height={s.image.height ?? 1080}
								class="absolute inset-0 h-full w-full object-cover"
								loading={i === 0 ? 'eager' : 'lazy'}
								fetchpriority={i === 0 ? 'high' : 'low'}
								decoding={i === 0 ? 'sync' : 'async'}
							/>
						</picture>
					{/if}
					<div class="absolute inset-0 bg-gradient-to-r from-secondary/70 via-secondary/25 to-transparent" aria-hidden="true"></div>
					<div class="absolute inset-0 bg-secondary" style="opacity: {s.overlay / 100}" aria-hidden="true"></div>
					<div class="relative container-page flex h-full flex-col justify-center pt-8 pb-24 md:pb-36">
						<div class="flex max-w-2xl flex-col {alignCls(s.align)}">
							{#if s.heading}
								{#if i === 0}
									<h1 class="text-4xl leading-[1.08] text-white drop-shadow-sm sm:text-6xl">{s.heading}</h1>
								{:else}
									<p class="font-heading text-4xl leading-[1.08] text-white drop-shadow-sm sm:text-6xl">{s.heading}</p>
								{/if}
							{/if}
							{#if s.subheading}<p class="mt-5 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">{s.subheading}</p>{/if}
							{#if (s.buttonText && s.buttonLink) || secondary}
								<div class="mt-8 flex flex-wrap gap-3 {s.align === 'center' ? 'justify-center' : s.align === 'right' ? 'justify-end' : ''}">
									{#if s.buttonText && s.buttonLink}<a href={s.buttonLink} class="btn-light px-6">{s.buttonText}</a>{/if}
									{#if secondary}<a href={secondary.href} class="btn border border-white/60 px-6 text-white hover:bg-white/10"><Icon name="phone" size={18} /> {secondary.text}</a>{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if multi}
			<!-- md+: lifted above the intent cards that overlap the bottom of the hero -->
			<div class="absolute inset-x-0 bottom-6 z-20 md:bottom-20">
				<div class="container-page flex items-center gap-3">
					{#if settings.showArrows}
						<button type="button" class="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30" aria-label="Previous slide" onclick={() => go(index - 1, true)}>
							<Icon name="chevron-left" />
						</button>
						<button type="button" class="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30" aria-label="Next slide" onclick={() => go(index + 1, true)}>
							<Icon name="chevron-right" />
						</button>
					{/if}
					{#if settings.showDots}
						<div class="flex items-center gap-1">
							{#each slides as s, i (s.id)}
								<button type="button" class="group flex size-6 items-center justify-center" aria-label="Show slide {i + 1}" aria-current={i === index ? 'true' : undefined} onclick={() => go(i, true)}>
									<span class="block h-1.5 rounded-full bg-white transition-all {i === index ? 'w-6 opacity-100' : 'w-1.5 opacity-60 group-hover:opacity-90'}"></span>
								</button>
							{/each}
						</div>
					{/if}
					{#if !reducedMotion}
						<button
							type="button"
							class="ml-auto flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
							aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
							aria-pressed={userPaused}
							onclick={() => (userPaused = !userPaused)}
						>
							{#if userPaused}<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
							{:else}<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" /></svg>{/if}
						</button>
					{/if}
				</div>
			</div>
			<p class="sr-only" aria-live="polite">{liveMessage}</p>
		{/if}
	</section>
{/if}
