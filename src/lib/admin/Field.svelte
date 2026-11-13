<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		id?: string;
		hint?: string;
		error?: string;
		required?: boolean;
		class?: string;
		children: Snippet<[{ id: string; invalid: boolean; describedby: string | undefined }]>;
	}

	let { label, id, hint, error, required = false, class: klass = '', children }: Props = $props();
	const uid = $props.id();
	const fieldId = $derived(id ?? `f-${uid}`);
	const describedby = $derived(
		[hint ? `${fieldId}-hint` : '', error ? `${fieldId}-err` : ''].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={klass}>
	<label for={fieldId} class="label">
		{label}
		{#if required}<span class="text-red-700" aria-hidden="true">*</span>{/if}
	</label>
	{@render children({ id: fieldId, invalid: !!error, describedby })}
	{#if hint}<p id="{fieldId}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{fieldId}-err" class="field-error">{error}</p>{/if}
</div>
