<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import InfoTip from './InfoTip.svelte';
	import { pageHelp } from './help.js';

	interface Props {
		title: string;
		description?: string;
		back?: { href: string; label: string };
		actions?: Snippet;
	}
	let { title, description, back, actions }: Props = $props();

	// Every admin page explains itself through the ⓘ button (texts in help.ts).
	const help = $derived(pageHelp(page.route.id, page.data.site.labels));
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		{#if back}
			<a href={back.href} class="mb-1 inline-block text-sm text-muted hover:text-ink">← {back.label}</a>
		{/if}
		<div class="flex items-center gap-1.5">
			<h1 class="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
			{#if help}<InfoTip {help} {title} />{/if}
		</div>
		{#if description}<p class="mt-1 max-w-2xl text-sm text-muted">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
</div>
