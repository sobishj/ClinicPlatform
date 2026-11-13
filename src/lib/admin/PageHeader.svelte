<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		title: string;
		description?: string;
		back?: { href: string; label: string };
		actions?: Snippet;
	}
	let { title, description, back, actions }: Props = $props();
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		{#if back}
			<a href={back.href} class="mb-1 inline-block text-sm text-muted hover:text-ink">← {back.label}</a>
		{/if}
		<h1 class="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
		{#if description}<p class="mt-1 max-w-2xl text-sm text-muted">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
</div>
