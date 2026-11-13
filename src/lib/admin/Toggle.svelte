<script lang="ts">
	interface Props {
		checked: boolean;
		label: string;
		description?: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
		compact?: boolean;
	}
	let { checked = $bindable(), label, description, disabled = false, onchange, compact = false }: Props = $props();
	const uid = $props.id();
</script>

<div class="flex items-start justify-between gap-4 {compact ? '' : 'py-2'}">
	<div class="min-w-0">
		<label for="t-{uid}" class="text-sm font-medium text-ink {compact ? 'sr-only' : ''}">{label}</label>
		{#if description && !compact}<p id="t-{uid}-d" class="text-sm text-muted">{description}</p>{/if}
	</div>
	<button
		id="t-{uid}"
		type="button"
		role="switch"
		aria-label={label}
		aria-checked={checked}
		aria-describedby={description && !compact ? `t-${uid}-d` : undefined}
		{disabled}
		onclick={() => {
			checked = !checked;
			onchange?.(checked);
		}}
		class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {checked
			? 'bg-primary'
			: 'bg-gray-300'} disabled:opacity-50"
	>
		<span
			class="inline-block size-5 transform rounded-full bg-white shadow transition-transform {checked
				? 'translate-x-5.5'
				: 'translate-x-0.5'}"
		></span>
	</button>
</div>
