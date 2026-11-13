<script lang="ts">
	import MediaPicker from './MediaPicker.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ImageRef } from '#lib/types.js';

	interface Props {
		label: string;
		items: ImageRef[];
		max?: number;
		maxWidth?: number;
		hint?: string;
	}
	let { label, items = $bindable(), max = 12, maxWidth = 1600, hint }: Props = $props();
	let open = $state(false);

	function move(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= items.length) return;
		const next = [...items];
		[next[i], next[j]] = [next[j], next[i]];
		items = next;
	}
</script>

<fieldset>
	<legend class="label">{label}</legend>
	{#if hint}<p class="hint mt-0 mb-2">{hint}</p>{/if}
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each items as img, i (img.url + i)}
			<li class="overflow-hidden rounded-lg border border-line bg-white">
				<img src={img.url} alt={img.alt} class="aspect-[4/3] w-full object-cover" />
				<div class="space-y-1 p-2">
					<input class="input py-1 text-xs" bind:value={img.alt} aria-label="Alt text for photo {i + 1}" placeholder="Alt text (required)" aria-invalid={!img.alt} />
					<div class="flex justify-between">
						<span class="text-xs text-muted">{i === 0 ? 'Main photo' : `#${i + 1}`}</span>
						<span class="flex">
							<button type="button" class="rounded p-1 text-xs hover:bg-gray-100" aria-label="Move photo {i + 1} earlier" disabled={i === 0} onclick={() => move(i, -1)}>◀</button>
							<button type="button" class="rounded p-1 text-xs hover:bg-gray-100" aria-label="Move photo {i + 1} later" disabled={i === items.length - 1} onclick={() => move(i, 1)}>▶</button>
							<button type="button" class="rounded p-1 text-red-700 hover:bg-red-50" aria-label="Remove photo {i + 1}" onclick={() => (items = items.filter((_, j) => j !== i))}>
								<Icon name="x" size={14} />
							</button>
						</span>
					</div>
				</div>
			</li>
		{/each}
		{#if items.length < max}
			<li>
				<button
					type="button"
					class="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-primary hover:text-primary-700"
					onclick={() => (open = true)}
				>
					<Icon name="plus" /> Add photo
				</button>
			</li>
		{/if}
	</ul>
</fieldset>

<MediaPicker bind:open {maxWidth} onselect={(ref) => (items = [...items, ref])} />
