<script lang="ts">
	import Field from './Field.svelte';

	interface Props {
		label: string;
		value: string | number | null | undefined;
		type?: 'text' | 'email' | 'url' | 'tel' | 'number' | 'password' | 'date' | 'time' | 'textarea';
		hint?: string;
		error?: string;
		required?: boolean;
		placeholder?: string;
		rows?: number;
		maxlength?: number;
		min?: number;
		max?: number;
		step?: number;
		autocomplete?: HTMLInputElement['autocomplete'];
		class?: string;
		mono?: boolean;
		oninput?: () => void;
	}

	let {
		label,
		value = $bindable(),
		type = 'text',
		hint,
		error,
		required = false,
		placeholder,
		rows = 4,
		maxlength,
		min,
		max,
		step,
		autocomplete,
		class: klass = '',
		mono = false,
		oninput
	}: Props = $props();
</script>

<Field {label} {hint} {error} {required} class={klass}>
	{#snippet children({ id, invalid, describedby })}
		{#if type === 'textarea'}
			<textarea
				{id}
				bind:value
				{rows}
				{placeholder}
				{maxlength}
				{required}
				aria-invalid={invalid}
				aria-describedby={describedby}
				class="input {mono ? 'font-mono text-sm' : ''}"
				{oninput}
			></textarea>
		{:else if type === 'number'}
			<input
				{id}
				type="number"
				bind:value
				{min}
				{max}
				{step}
				{placeholder}
				{required}
				aria-invalid={invalid}
				aria-describedby={describedby}
				class="input"
				{oninput}
			/>
		{:else}
			<input
				{id}
				{type}
				bind:value
				{placeholder}
				{maxlength}
				{required}
				{autocomplete}
				aria-invalid={invalid}
				aria-describedby={describedby}
				class="input {mono ? 'font-mono text-sm' : ''}"
				{oninput}
			/>
		{/if}
	{/snippet}
</Field>
