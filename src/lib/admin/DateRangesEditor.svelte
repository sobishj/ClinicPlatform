<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';

	interface Range {
		startDate: string;
		endDate: string;
		reason?: string;
	}
	interface Props {
		label: string;
		items: Range[];
		hint?: string;
		reasonPlaceholder?: string;
		errors?: Record<string, string>;
		prefix?: string;
	}
	let { label, items = $bindable(), hint, reasonPlaceholder = 'Reason (optional)', errors = {}, prefix = '' }: Props = $props();

	function add() {
		const today = new Date().toISOString().slice(0, 10);
		items = [...items, { startDate: today, endDate: today, reason: '' }];
	}
</script>

<fieldset>
	<legend class="label">{label}</legend>
	{#if hint}<p class="hint mt-0 mb-2">{hint}</p>{/if}
	<ul class="space-y-2">
		{#each items as r, i (i)}
			<li class="flex flex-wrap items-center gap-2">
				<input type="date" class="input w-40 py-1.5" bind:value={r.startDate} aria-label="From" />
				<span class="text-muted">to</span>
				<input type="date" class="input w-40 py-1.5" bind:value={r.endDate} min={r.startDate} aria-label="To" />
				<input class="input min-w-40 flex-1 py-1.5" bind:value={r.reason} placeholder={reasonPlaceholder} aria-label="Reason" />
				<button type="button" class="btn-ghost btn-sm text-red-700" aria-label="Remove" onclick={() => (items = items.filter((_, j) => j !== i))}>
					<Icon name="x" size={16} />
				</button>
				{#if errors[`${prefix}${i}`]}<p class="field-error w-full">{errors[`${prefix}${i}`]}</p>{/if}
			</li>
		{/each}
	</ul>
	<button type="button" class="btn-outline btn-sm mt-2" onclick={add}><Icon name="plus" size={16} /> Add dates</button>
</fieldset>
