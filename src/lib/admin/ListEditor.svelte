<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		label: string;
		items: string[];
		placeholder?: string;
		hint?: string;
		max?: number;
		error?: string;
		multiline?: boolean;
	}
	let { label, items = $bindable(), placeholder = '', hint, max = 50, error, multiline = false }: Props = $props();
	const uid = $props.id();
</script>

<fieldset>
	<legend class="label">{label}</legend>
	<ul class="space-y-2">
		{#each items as _, i (i)}
			<li class="flex gap-2">
				{#if multiline}
					<textarea class="input" rows="2" bind:value={items[i]} {placeholder} aria-label="{label} {i + 1}"></textarea>
				{:else}
					<input class="input" bind:value={items[i]} {placeholder} aria-label="{label} {i + 1}" />
				{/if}
				<button
					type="button"
					class="btn-ghost btn-sm"
					aria-label="Move {label} {i + 1} up"
					disabled={i === 0}
					onclick={() => {
						[items[i - 1], items[i]] = [items[i], items[i - 1]];
					}}>↑</button
				>
				<button type="button" class="btn-ghost btn-sm text-red-700" aria-label="Remove {label} {i + 1}" onclick={() => items.splice(i, 1)}>
					<Icon name="x" size={16} />
				</button>
			</li>
		{/each}
	</ul>
	{#if items.length < max}
		<button type="button" class="btn-outline btn-sm mt-2" id="add-{uid}" onclick={() => items.push('')}>
			<Icon name="plus" size={16} /> Add
		</button>
	{/if}
	{#if hint}<p class="hint">{hint}</p>{/if}
	{#if error}<p class="field-error">{error}</p>{/if}
</fieldset>
