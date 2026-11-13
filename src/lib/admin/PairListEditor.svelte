<script lang="ts">
	/** Editable list of two-field records, e.g. FAQs (question/answer) or steps (title/description). */
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows of any two-string-field shape
		items: any[];
		first: { key: string; label: string };
		second: { key: string; label: string; multiline?: boolean };
		addLabel?: string;
		max?: number;
		hint?: string;
	}
	let { label, items = $bindable(), first, second, addLabel = 'Add', max = 30, hint }: Props = $props();

	function swap(i: number, j: number) {
		const next = [...items];
		[next[i], next[j]] = [next[j], next[i]];
		items = next;
	}
</script>

<fieldset>
	<legend class="label">{label}</legend>
	{#if hint}<p class="hint mt-0 mb-2">{hint}</p>{/if}
	<ol class="space-y-3">
		{#each items as item, i (i)}
			<li class="rounded-lg border border-line p-3">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs font-semibold text-muted">#{i + 1}</span>
					<div class="flex gap-1">
						<button type="button" class="btn-ghost btn-sm" disabled={i === 0} aria-label="Move up" onclick={() => swap(i, i - 1)}>▲</button>
						<button type="button" class="btn-ghost btn-sm" disabled={i === items.length - 1} aria-label="Move down" onclick={() => swap(i, i + 1)}>▼</button>
						<button type="button" class="btn-ghost btn-sm text-red-700" aria-label="Remove" onclick={() => (items = items.filter((_, j) => j !== i))}>
							<Icon name="x" size={16} />
						</button>
					</div>
				</div>
				<label class="block text-sm">
					<span class="text-muted">{first.label}</span>
					<input class="input mt-1" bind:value={item[first.key]} />
				</label>
				<label class="mt-2 block text-sm">
					<span class="text-muted">{second.label}</span>
					{#if second.multiline}
						<textarea class="input mt-1" rows="3" bind:value={item[second.key]}></textarea>
					{:else}
						<input class="input mt-1" bind:value={item[second.key]} />
					{/if}
				</label>
			</li>
		{/each}
	</ol>
	{#if items.length < max}
		<button type="button" class="btn-outline btn-sm mt-2" onclick={() => (items = [...items, { [first.key]: '', [second.key]: '' }])}>
			<Icon name="plus" size={16} />
			{addLabel}
		</button>
	{/if}
</fieldset>
