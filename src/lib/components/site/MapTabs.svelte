<script lang="ts">
	import { isAllowedEmbedUrl } from '#lib/maps.js';
	import Icon from '../Icon.svelte';
	import { fullAddress } from '#lib/format.js';

	interface Loc {
		slug: string;
		name: string;
		mapEmbedUrl: string | null;
		directionsUrl: string | null;
		addressLine1: string;
		area?: string | null;
		city: string;
	}
	let { locations }: { locations: Loc[] } = $props();
	const withMap = $derived(locations.filter((l) => isAllowedEmbedUrl(l.mapEmbedUrl)));
	let active = $state(0);
	const uid = $props.id();
	const tabs: HTMLButtonElement[] = $state([]);

	function key(e: KeyboardEvent, i: number) {
		let next = i;
		if (e.key === 'ArrowRight') next = (i + 1) % withMap.length;
		else if (e.key === 'ArrowLeft') next = (i - 1 + withMap.length) % withMap.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = withMap.length - 1;
		else return;
		e.preventDefault();
		active = next;
		tabs[next]?.focus();
	}
</script>

{#if withMap.length}
	<div class="card overflow-hidden">
		{#if withMap.length > 1}
			<div role="tablist" aria-label="Choose a branch map" class="flex gap-1 overflow-x-auto border-b border-line bg-white p-2">
				{#each withMap as l, i (l.slug)}
					<button
						bind:this={tabs[i]}
						type="button"
						role="tab"
						id="tab-{uid}-{i}"
						aria-selected={active === i}
						aria-controls="panel-{uid}"
						tabindex={active === i ? 0 : -1}
						class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold {active === i ? 'bg-primary text-white' : 'text-ink hover:bg-primary-50'}"
						onclick={() => (active = i)}
						onkeydown={(e) => key(e, i)}>{l.name}</button
					>
				{/each}
			</div>
		{/if}
		{#key active}
			{@const l = withMap[active]}
			<div id="panel-{uid}" role={withMap.length > 1 ? 'tabpanel' : undefined} aria-labelledby={withMap.length > 1 ? `tab-${uid}-${active}` : undefined}>
				<iframe
					title="Map of {l.name}"
					src={l.mapEmbedUrl}
					class="block h-80 w-full sm:h-[26rem]"
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
					allowfullscreen
				></iframe>
				<div class="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-sm">
					<span class="flex items-center gap-2"><Icon name="map-pin" size={16} class="text-primary-700" /> {fullAddress(l)}</span>
					{#if l.directionsUrl}<a href={l.directionsUrl} target="_blank" rel="noopener" class="btn-outline btn-sm">Get directions</a>{/if}
				</div>
			</div>
		{/key}
	</div>
{/if}
