<script lang="ts">
	import Icon from '../Icon.svelte';
	let { rating = 5, size = 16 }: { rating?: number; size?: number } = $props();
</script>

<span class="inline-flex text-accent" role="img" aria-label="{rating} out of 5 stars">
	{#each [1, 2, 3, 4, 5] as n (n)}
		<Icon name="star" {size} class={n <= rating ? 'fill-current' : 'text-gray-300'} />
	{/each}
</span>
