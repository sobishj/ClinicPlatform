<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		items: T[];
		key: (item: T) => string;
		label: (item: T) => string;
		row: Snippet<[T, number]>;
		/** Called after any reorder (drag or buttons). */
		onreorder?: (items: T[]) => void;
		class?: string;
	}
	let { items = $bindable(), key, label, row, onreorder, class: klass = '' }: Props = $props();

	let dragIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);
	let announcement = $state('');

	function move(from: number, to: number) {
		if (to < 0 || to >= items.length || from === to) return;
		const next = [...items];
		const [it] = next.splice(from, 1);
		next.splice(to, 0, it);
		items = next;
		announcement = `${label(it)} moved to position ${to + 1} of ${items.length}`;
		onreorder?.(items);
	}
</script>

<ul class="divide-y divide-line {klass}" data-sortable>
	{#each items as item, i (key(item))}
		<li
			class="flex items-center gap-2 bg-white px-2 py-2 transition-colors sm:px-3 {overIndex === i && dragIndex !== i
				? 'bg-primary-50'
				: ''} {dragIndex === i ? 'opacity-50' : ''}"
			draggable="true"
			data-id={key(item)}
			ondragstart={(e) => {
				dragIndex = i;
				e.dataTransfer?.setData('text/plain', String(i));
				if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
			}}
			ondragover={(e) => {
				e.preventDefault();
				overIndex = i;
			}}
			ondragleave={() => (overIndex = null)}
			ondrop={(e) => {
				e.preventDefault();
				const from = dragIndex ?? Number(e.dataTransfer?.getData('text/plain'));
				dragIndex = overIndex = null;
				move(from, i);
			}}
			ondragend={() => (dragIndex = overIndex = null)}
		>
			<span class="cursor-grab text-muted" aria-hidden="true"><Icon name="grip" size={18} /></span>
			<div class="min-w-0 flex-1">{@render row(item, i)}</div>
			<div class="flex shrink-0 flex-col sm:flex-row">
				<button
					type="button"
					class="rounded p-1 text-muted hover:bg-gray-100 hover:text-ink disabled:opacity-30"
					aria-label="Move {label(item)} up"
					disabled={i === 0}
					onclick={() => move(i, i - 1)}>▲</button
				>
				<button
					type="button"
					class="rounded p-1 text-muted hover:bg-gray-100 hover:text-ink disabled:opacity-30"
					aria-label="Move {label(item)} down"
					disabled={i === items.length - 1}
					onclick={() => move(i, i + 1)}>▼</button
				>
			</div>
		</li>
	{/each}
</ul>
<p class="sr-only" aria-live="polite">{announcement}</p>
