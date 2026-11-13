<script lang="ts">
	interface Props {
		eyebrow?: string;
		heading: string;
		intro?: string;
		align?: 'left' | 'center';
		id?: string;
		level?: 'h1' | 'h2';
	}
	let { eyebrow, heading, intro, align = 'left', id, level = 'h2' }: Props = $props();
</script>

<div class="mb-10 max-w-2xl {align === 'center' ? 'mx-auto text-center' : ''}">
	{#if eyebrow}<p class="eyebrow mb-3">{eyebrow}</p>{/if}
	<svelte:element this={level} {id} class="section-title">{heading}</svelte:element>
	{#if intro}<p class="lead mt-4">{intro}</p>{/if}
</div>
