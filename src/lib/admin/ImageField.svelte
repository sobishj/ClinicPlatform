<script lang="ts">
	import MediaPicker from './MediaPicker.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ImageRef } from '#lib/types.js';

	interface Props {
		label: string;
		value: ImageRef | null | undefined;
		hint?: string;
		error?: string;
		required?: boolean;
		maxWidth?: number;
		aspect?: number;
		/** Preview box aspect class */
		previewClass?: string;
	}
	let {
		label,
		value = $bindable(),
		hint,
		error,
		required = false,
		maxWidth = 1920,
		aspect,
		previewClass = 'aspect-video'
	}: Props = $props();
	let open = $state(false);
	const uid = $props.id();
</script>

<div>
	<span class="label" id="img-{uid}">
		{label}
		{#if required}<span class="text-red-700" aria-hidden="true">*</span>{/if}
	</span>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start">
		<div class="w-full overflow-hidden rounded-lg border border-line bg-gray-50 sm:w-48 {previewClass}">
			{#if value?.url}
				<img src={value.url} alt={value.alt} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full min-h-24 items-center justify-center text-muted"><Icon name="image" size={28} /></div>
			{/if}
		</div>
		<div class="min-w-0 flex-1 space-y-2">
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn-outline btn-sm" aria-describedby="img-{uid}" onclick={() => (open = true)}>
					{value?.url ? 'Replace' : 'Choose image'}
				</button>
				{#if value?.url && !required}
					<button type="button" class="btn-ghost btn-sm text-red-700" onclick={() => (value = null)}>Remove</button>
				{/if}
			</div>
			{#if value?.url}
				<label class="block text-sm">
					<span class="text-muted">Alt text</span>
					<input
						class="input mt-1"
						value={value.alt}
						oninput={(e) => (value = { ...value!, alt: e.currentTarget.value })}
						aria-invalid={!value.alt}
						required
					/>
				</label>
			{/if}
			{#if hint}<p class="hint">{hint}</p>{/if}
			{#if error}<p class="field-error">{error}</p>{/if}
		</div>
	</div>
</div>

<MediaPicker bind:open {maxWidth} {aspect} onselect={(ref) => (value = ref)} />
