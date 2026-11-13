<script lang="ts">
	interface Props {
		label: string;
		options: Array<{ value: string; label: string; hint?: string }>;
		selected: string[];
		hint?: string;
		error?: string;
		columns?: 1 | 2 | 3;
		empty?: string;
	}
	let { label, options, selected = $bindable(), hint, error, columns = 2, empty = 'Nothing to choose yet.' }: Props = $props();
	const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' };
</script>

<fieldset>
	<legend class="label">{label}</legend>
	{#if hint}<p class="hint mt-0 mb-2">{hint}</p>{/if}
	{#if !options.length}
		<p class="text-sm text-muted">{empty}</p>
	{:else}
		<div class="grid gap-2 {cols[columns]}">
			{#each options as o (o.value)}
				<label class="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-50">
					<input type="checkbox" value={o.value} bind:group={selected} class="mt-0.5 rounded text-primary" />
					<span>{o.label}{#if o.hint}<span class="block text-xs text-muted">{o.hint}</span>{/if}</span>
				</label>
			{/each}
		</div>
		<div class="mt-2 flex gap-3 text-sm">
			<button type="button" class="text-primary-700 hover:underline" onclick={() => (selected = options.map((o) => o.value))}>Select all</button>
			<button type="button" class="text-primary-700 hover:underline" onclick={() => (selected = [])}>Clear</button>
		</div>
	{/if}
	{#if error}<p class="field-error">{error}</p>{/if}
</fieldset>
