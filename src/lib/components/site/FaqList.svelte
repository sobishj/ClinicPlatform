<script lang="ts">
	import Icon from '../Icon.svelte';

	interface Props {
		items: Array<{ question: string; answer: string; id?: string }>;
		/** Answers are sanitised HTML (from the rich-text editor) or plain text. */
		html?: boolean;
	}
	let { items, html = true }: Props = $props();
</script>

<div class="divide-y divide-line rounded-brand border border-line bg-white">
	{#each items as f, i (f.id ?? i)}
		<details class="group" name="faq">
			<summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold [&::-webkit-details-marker]:hidden">
				<span>{f.question}</span>
				<Icon name="plus" size={20} class="shrink-0 text-primary-700 transition-transform group-open:rotate-45" />
			</summary>
			<div class="prose-clinic px-5 pb-5 text-muted">
				{#if html}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on save -->
					{@html f.answer}
				{:else}<p>{f.answer}</p>{/if}
			</div>
		</details>
	{/each}
</div>
