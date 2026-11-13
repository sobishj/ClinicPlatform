<script lang="ts">
	import MediaPicker from './MediaPicker.svelte';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		label: string;
		value: string | null;
		hint?: string;
	}
	let { label, value = $bindable(), hint }: Props = $props();
	let open = $state(false);
</script>

<div>
	<span class="label">{label}</span>
	<div class="flex flex-wrap items-center gap-2">
		{#if value}
			<a href={value} target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm text-primary-700 underline"><Icon name="file-text" size={16} /> View PDF</a>
			<button type="button" class="btn-ghost btn-sm text-red-700" onclick={() => (value = null)}>Remove</button>
		{/if}
		<button type="button" class="btn-outline btn-sm" onclick={() => (open = true)}>{value ? 'Replace PDF' : 'Choose PDF'}</button>
	</div>
	{#if hint}<p class="hint">{hint}</p>{/if}
</div>

<MediaPicker bind:open kind="pdf" onselect={(ref) => (value = ref.url)} />
