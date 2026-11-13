<script lang="ts" generics="T extends { id: string; active?: boolean }">
	import type { Snippet } from 'svelte';
	import SortableList from './SortableList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { callAction } from './actions.js';

	interface Props {
		items: T[];
		title: (item: T) => string;
		subtitle?: (item: T) => string;
		image?: (item: T) => string | null | undefined;
		editHref?: (item: T) => string;
		onedit?: (item: T) => void;
		canWrite: boolean;
		sortable?: boolean;
		empty?: string;
		extra?: Snippet<[T]>;
		entityLabel?: string;
	}
	let {
		items,
		title,
		subtitle,
		image,
		editHref,
		onedit,
		canWrite,
		sortable = true,
		empty = 'Nothing here yet.',
		extra,
		entityLabel = 'item'
	}: Props = $props();

	// Local copy so drag reordering is instant; resynced when server data changes.
	let list = $state<T[]>([]);
	$effect.pre(() => {
		list = [...items];
	});

	async function reorder(next: T[]) {
		await callAction('?/reorder', { payload: { ids: next.map((i) => i.id) } }, { success: 'Order saved', invalidate: false });
	}
	async function toggle(item: T) {
		const value = !item.active;
		item.active = value;
		await callAction('?/toggle', { id: item.id, value: String(value) }, { success: value ? 'Shown on website' : 'Hidden from website' });
	}
	async function remove(item: T) {
		if (!confirm(`Delete “${title(item)}”? This cannot be undone.`)) return;
		await callAction('?/delete', { id: item.id }, { success: 'Deleted' });
	}
</script>

{#snippet row(item: T)}
	<div class="flex items-center gap-3">
		{#if image}
			{@const src = image(item)}
			<div class="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
				{#if src}<img {src} alt="" class="h-full w-full object-cover" loading="lazy" />{/if}
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			{#if editHref && canWrite}
				<a href={editHref(item)} class="block truncate font-medium hover:text-primary-700">{title(item)}</a>
			{:else if onedit && canWrite}
				<button type="button" class="block truncate text-left font-medium hover:text-primary-700" onclick={() => onedit(item)}>{title(item)}</button>
			{:else}
				<span class="block truncate font-medium">{title(item)}</span>
			{/if}
			{#if subtitle}<p class="truncate text-sm text-muted">{subtitle(item)}</p>{/if}
		</div>
		{#if extra}{@render extra(item)}{/if}
		{#if item.active !== undefined}
			{#if canWrite}
				<button
					type="button"
					class="hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-block {item.active ? 'bg-primary-50 text-primary-800' : 'bg-gray-100 text-muted'}"
					aria-label="{item.active ? 'Hide' : 'Show'} {title(item)}"
					onclick={() => toggle(item)}>{item.active ? 'Visible' : 'Hidden'}</button
				>
			{:else}
				<span class="hidden text-xs text-muted sm:inline">{item.active ? 'Visible' : 'Hidden'}</span>
			{/if}
		{/if}
		{#if canWrite}
			{#if editHref}
				<a href={editHref(item)} class="btn-ghost btn-sm" aria-label="Edit {title(item)}"><Icon name="pencil" size={16} /></a>
			{:else if onedit}
				<button type="button" class="btn-ghost btn-sm" aria-label="Edit {title(item)}" onclick={() => onedit(item)}><Icon name="pencil" size={16} /></button>
			{/if}
			<button type="button" class="btn-ghost btn-sm text-red-700" aria-label="Delete {title(item)}" onclick={() => remove(item)}>
				<Icon name="trash" size={16} />
			</button>
		{/if}
	</div>
{/snippet}

<div class="card overflow-hidden">
	{#if !list.length}
		<p class="px-4 py-10 text-center text-muted">{empty}</p>
	{:else if sortable && canWrite}
		<SortableList bind:items={list} key={(i) => i.id} label={title} {row} onreorder={reorder} />
		<p class="border-t border-line bg-gray-50 px-4 py-2 text-xs text-muted">Drag rows, or use ▲ ▼, to change the order on the website. The order saves automatically.</p>
	{:else}
		<ul class="divide-y divide-line">
			{#each list as item (item.id)}<li class="px-3 py-2">{@render row(item)}</li>{/each}
		</ul>
	{/if}
</div>
<span class="sr-only">{entityLabel}</span>
