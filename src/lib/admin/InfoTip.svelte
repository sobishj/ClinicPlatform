<script lang="ts">
	/**
	 * ⓘ button that explains the current page. Opens on hover, keyboard focus or tap;
	 * stays open while the pointer is over the explanation; closes on Escape, blur or
	 * clicking elsewhere (WCAG 1.4.13 content on hover or focus).
	 */
	import Icon from '#lib/components/Icon.svelte';
	import type { PageHelp } from './help.js';

	let {
		help,
		title,
		label = 'About this page',
		small = false,
		align = 'left'
	}: {
		help: PageHelp;
		title: string;
		/** Accessible name of the ⓘ button. */
		label?: string;
		/** Smaller button, for use next to a field label. */
		small?: boolean;
		/** Which edge the explanation lines up with (use 'right' near the right side of the screen). */
		align?: 'left' | 'right';
	} = $props();
	let open = $state(false);
	let pinned = $state(false);
	let root: HTMLSpanElement | undefined = $state();
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	const uid = $props.id();

	function show() {
		clearTimeout(closeTimer);
		open = true;
	}
	function hideSoon() {
		if (pinned) return;
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => (open = false), 150);
	}
	function close() {
		pinned = false;
		open = false;
	}
</script>

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && open && close()}
	onpointerdown={(e) => open && root && !root.contains(e.target as Node) && close()}
/>

<span bind:this={root} class="relative inline-flex align-middle" role="presentation" onmouseenter={show} onmouseleave={hideSoon}>
	<button
		type="button"
		class="flex {small ? 'size-6' : 'size-7'} items-center justify-center rounded-full text-primary-700 transition-colors hover:bg-primary-50 focus-visible:bg-primary-50 {open ? 'bg-primary-50' : ''}"
		aria-label={label}
		aria-describedby="tip-{uid}"
		aria-expanded={open}
		onfocus={show}
		onblur={hideSoon}
		onclick={() => {
			pinned = !pinned || !open;
			open = pinned;
		}}
	>
		<Icon name="info" size={small ? 16 : 20} />
	</button>
	<span
		id="tip-{uid}"
		role="tooltip"
		class="absolute top-full {align === 'right' ? 'right-0' : 'left-0'} z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-4 text-left font-sans text-sm leading-relaxed font-normal tracking-normal text-ink shadow-xl {open
			? ''
			: 'hidden'}"
	>
		<span class="mb-1 block font-semibold">About “{help.name ?? title}”</span>
		<span class="block text-muted">{help.purpose}</span>
		{#if help.points?.length}
			<span class="mt-2 block space-y-1">
				{#each help.points as p (p)}
					<span class="flex gap-2"><span aria-hidden="true" class="text-primary-700">•</span><span>{p}</span></span>
				{/each}
			</span>
		{/if}
	</span>
</span>
