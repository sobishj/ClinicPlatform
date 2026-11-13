<script lang="ts">
	import Field from './Field.svelte';

	type Option = string | { value: string; label: string };
	interface Props {
		label: string;
		value: string | null | undefined;
		options: Option[];
		hint?: string;
		error?: string;
		required?: boolean;
		placeholder?: string;
		class?: string;
		onchange?: () => void;
	}
	let {
		label,
		value = $bindable(),
		options,
		hint,
		error,
		required = false,
		placeholder,
		class: klass = '',
		onchange
	}: Props = $props();
	const norm = $derived(options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
</script>

<Field {label} {hint} {error} {required} class={klass}>
	{#snippet children({ id, invalid, describedby })}
		<select {id} bind:value {required} aria-invalid={invalid} aria-describedby={describedby} class="input" {onchange}>
			{#if placeholder !== undefined}<option value="">{placeholder}</option>{/if}
			{#each norm as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</select>
	{/snippet}
</Field>
