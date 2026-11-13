<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import MediaPicker from '#lib/admin/MediaPicker.svelte';
	import Pager from '#lib/admin/Pager.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { callAction } from '#lib/admin/actions.js';
	import { formatBytes } from '#lib/client/image.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let uploadOpen = $state(false);
	let selected = $state<(typeof data.items)[number] | null>(null);
	let alt = $state('');

	function select(m: (typeof data.items)[number]) {
		selected = m;
		alt = m.alt;
	}
	async function saveAlt() {
		if (!selected) return;
		if (await callAction('?/alt', { payload: { id: selected.id, alt } }, { success: 'Alt text saved' })) selected.alt = alt;
	}
	async function remove() {
		if (!selected || !confirm('Delete this file permanently?')) return;
		if (await callAction('?/delete', { id: selected.id }, { success: 'Deleted' })) selected = null;
	}
</script>

<PageHeader title="Media library" description="All uploaded images and PDFs. Images are resized and converted to WebP in your browser before upload. Every image needs alt text.">
	{#snippet actions()}
		<button class="btn-primary" onclick={() => (uploadOpen = true)}><Icon name="upload" size={16} /> Upload</button>
	{/snippet}
</PageHeader>

<form method="GET" class="mb-4 flex gap-2">
	<label class="sr-only" for="q">Search</label>
	<input id="q" name="q" class="input max-w-sm" placeholder="Search alt text or file name" value={data.q} />
	<button class="btn-outline">Search</button>
</form>

<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
		{#each data.items as m (m.id)}
			<li>
				<button
					type="button"
					class="block w-full overflow-hidden rounded-lg border text-left {selected?.id === m.id ? 'border-primary ring-2 ring-primary' : 'border-line'}"
					onclick={() => select(m)}
					aria-pressed={selected?.id === m.id}
				>
					{#if m.mime.startsWith('image/')}
						<img src={m.url} alt={m.alt} class="aspect-square w-full bg-gray-50 object-cover" loading="lazy" />
					{:else}
						<div class="flex aspect-square items-center justify-center bg-gray-50"><Icon name="file-text" size={40} /></div>
					{/if}
					<span class="block truncate px-2 py-1 text-xs">{m.alt}</span>
				</button>
			</li>
		{:else}
			<li class="col-span-full py-10 text-center text-muted">No files found.</li>
		{/each}
	</ul>

	<aside class="lg:sticky lg:top-20 lg:self-start">
		{#if selected}
			<div class="card space-y-3 p-4">
				{#if selected.mime.startsWith('image/')}
					<img src={selected.url} alt={selected.alt} class="w-full rounded-lg bg-gray-50" />
				{/if}
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
					<dt class="text-muted">File</dt><dd class="truncate">{selected.filename ?? '—'}</dd>
					<dt class="text-muted">Type</dt><dd>{selected.mime}</dd>
					{#if selected.width}<dt class="text-muted">Size</dt><dd>{selected.width}×{selected.height}{selected.size ? ` · ${formatBytes(selected.size)}` : ''}</dd>{/if}
					<dt class="text-muted">URL</dt><dd class="truncate"><a class="link" href={selected.url} target="_blank" rel="noopener">{selected.url}</a></dd>
				</dl>
				<div>
					<label for="alt" class="label">Alt text</label>
					<textarea id="alt" class="input" rows="2" bind:value={alt}></textarea>
				</div>
				<div class="flex justify-between">
					<button class="btn-ghost btn-sm text-red-700" onclick={remove}>Delete</button>
					<button class="btn-primary btn-sm" onclick={saveAlt} disabled={!alt.trim()}>Save alt text</button>
				</div>
				<p class="text-xs text-muted">Files still used on the website cannot be deleted.</p>
			</div>
		{:else}
			<p class="card p-4 text-sm text-muted">Select a file to edit its alt text or delete it.</p>
		{/if}
	</aside>
</div>
<Pager page={data.page} hasMore={data.hasMore} />

<MediaPicker bind:open={uploadOpen} onselect={() => invalidateAll()} />
