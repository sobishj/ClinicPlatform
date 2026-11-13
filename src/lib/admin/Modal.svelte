<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		open: boolean;
		title: string;
		size?: 'md' | 'lg' | 'xl';
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}
	let { open = $bindable(), title, size = 'lg', children, footer, onclose }: Props = $props();
	let dialog: HTMLDialogElement | undefined = $state();
	const uid = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	const widths = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="m-{uid}"
	class="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] {widths[size]} overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-black/50"
	onclose={() => {
		open = false;
		onclose?.();
	}}
>
	{#if open}
		<div class="flex max-h-[92dvh] flex-col">
			<header class="flex items-center justify-between border-b border-line px-5 py-3">
				<h2 id="m-{uid}" class="font-sans text-lg font-semibold">{title}</h2>
				<button type="button" class="btn-ghost btn-sm" onclick={() => (open = false)} aria-label="Close">
					<Icon name="x" />
				</button>
			</header>
			<div class="overflow-y-auto px-5 py-4">{@render children()}</div>
			{#if footer}
				<footer class="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{@render footer()}</footer>
			{/if}
		</div>
	{/if}
</dialog>
