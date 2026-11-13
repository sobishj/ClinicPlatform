<script lang="ts">
	import Modal from './Modal.svelte';
	import CropDialog from './CropDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		needsProcessing,
		processImage,
		uploadMedia,
		formatBytes,
		type CropRect,
		type UploadedMedia
	} from '#lib/client/image.js';
	import type { ImageRef } from '#lib/types.js';

	interface Props {
		open: boolean;
		/** Longest edge after browser-side resize. */
		maxWidth?: number;
		/** If set, uploads go through the crop dialog with this aspect (w/h). */
		aspect?: number;
		kind?: 'image' | 'pdf';
		onselect: (ref: ImageRef) => void;
	}
	let { open = $bindable(), maxWidth = 1920, aspect, kind = 'image', onselect }: Props = $props();

	let tab = $state<'library' | 'upload'>('library');
	let items = $state<UploadedMedia[]>([]);
	let q = $state('');
	let page = $state(1);
	let hasMore = $state(false);
	let loading = $state(false);

	let file = $state<File | null>(null);
	let preview = $state('');
	let alt = $state('');
	let crop = $state<CropRect | undefined>();
	let cropOpen = $state(false);
	let uploading = $state(false);
	let uploadError = $state('');

	async function load(reset = true) {
		loading = true;
		if (reset) page = 1;
		const res = await fetch(`/admin/media/api?kind=${kind}&page=${page}&q=${encodeURIComponent(q)}`);
		const data = await res.json();
		items = reset ? data.items : [...items, ...data.items];
		hasMore = data.hasMore;
		loading = false;
	}

	$effect(() => {
		if (open) {
			tab = 'library';
			load();
		}
	});

	function choose(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!f) return;
		uploadError = '';
		file = f;
		crop = undefined;
		if (preview) URL.revokeObjectURL(preview);
		preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
		alt = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
		if (aspect && needsProcessing(f)) cropOpen = true;
	}

	async function upload() {
		if (!file) return;
		if (kind === 'image' && !alt.trim()) {
			uploadError = 'Please describe the image (alt text) — it is required for accessibility.';
			return;
		}
		uploading = true;
		uploadError = '';
		try {
			let blob: Blob = file;
			let width: number | undefined;
			let height: number | undefined;
			let filename = file.name;
			if (needsProcessing(file)) {
				const out = await processImage(file, { maxWidth, maxHeight: maxWidth * 1.5, crop });
				blob = out.blob;
				width = out.width;
				height = out.height;
				filename = file.name.replace(/\.[a-z0-9]+$/i, '') + (out.type === 'image/webp' ? '.webp' : '.jpg');
			}
			const saved = await uploadMedia(blob, { alt: alt.trim(), filename, width, height });
			onselect({ url: saved.url, alt: saved.alt, width: saved.width, height: saved.height, mediaId: saved.id });
			file = null;
			preview = '';
			open = false;
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function pick(m: UploadedMedia) {
		onselect({ url: m.url, alt: m.alt, width: m.width, height: m.height, mediaId: m.id });
		open = false;
	}
</script>

<Modal bind:open title={kind === 'pdf' ? 'Choose a PDF' : 'Choose an image'} size="xl">
	<div class="mb-4 flex gap-2" role="tablist">
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'library'}
			class={tab === 'library' ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}
			onclick={() => (tab = 'library')}>Media library</button
		>
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'upload'}
			class={tab === 'upload' ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}
			onclick={() => (tab = 'upload')}><Icon name="upload" size={16} /> Upload new</button
		>
	</div>

	{#if tab === 'library'}
		<form
			class="mb-4 flex gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				load();
			}}
		>
			<label class="sr-only" for="media-q">Search media</label>
			<input id="media-q" class="input" placeholder="Search by alt text or file name" bind:value={q} />
			<button class="btn-outline">Search</button>
		</form>
		{#if !items.length && !loading}
			<p class="py-10 text-center text-muted">No files yet. Upload one to get started.</p>
		{/if}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
			{#each items as m (m.id)}
				<li>
					<button
						type="button"
						class="group block w-full overflow-hidden rounded-lg border border-line text-left hover:ring-2 hover:ring-primary focus-visible:ring-2"
						onclick={() => pick(m)}
					>
						{#if m.mime.startsWith('image/')}
							<img src={m.url} alt={m.alt} class="aspect-square w-full bg-gray-50 object-cover" loading="lazy" />
						{:else}
							<div class="flex aspect-square items-center justify-center bg-gray-50"><Icon name="file-text" size={36} /></div>
						{/if}
						<span class="block truncate px-2 py-1 text-xs text-muted">{m.alt}</span>
					</button>
				</li>
			{/each}
		</ul>
		{#if hasMore}
			<div class="mt-4 text-center">
				<button
					type="button"
					class="btn-outline btn-sm"
					disabled={loading}
					onclick={() => {
						page += 1;
						load(false);
					}}>Load more</button
				>
			</div>
		{/if}
	{:else}
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="label" for="media-file">File</label>
				<input
					id="media-file"
					type="file"
					accept={kind === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/x-icon'}
					onchange={choose}
					class="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:font-semibold file:text-primary-800"
				/>
				<p class="hint">
					{#if kind === 'image'}
						Images are resized to {maxWidth}px and converted to WebP in your browser before upload.
					{:else}PDF, up to 8 MB.{/if}
				</p>
				{#if file}<p class="hint">Original: {formatBytes(file.size)}</p>{/if}
				<div class="mt-4">
					<label class="label" for="media-alt">
						{kind === 'image' ? 'Alt text (describe the image)' : 'Title'} <span class="text-red-700">*</span>
					</label>
					<input id="media-alt" class="input" bind:value={alt} maxlength="300" />
					<p class="hint">e.g. "Dentist explaining an X-ray to a patient". Read aloud by screen readers.</p>
				</div>
				{#if aspect && file && needsProcessing(file)}
					<button type="button" class="btn-outline btn-sm mt-3" onclick={() => (cropOpen = true)}>Adjust crop</button>
				{/if}
				{#if uploadError}<p class="field-error" role="alert">{uploadError}</p>{/if}
				<button type="button" class="btn-primary mt-5" disabled={!file || uploading} onclick={upload}>
					{uploading ? 'Uploading…' : 'Upload and use'}
				</button>
			</div>
			<div class="flex items-center justify-center rounded-lg bg-gray-50 p-3">
				{#if preview}
					<img src={preview} alt="Preview" class="max-h-72 rounded" />
				{:else}
					<p class="text-sm text-muted">Preview appears here</p>
				{/if}
			</div>
		</div>
	{/if}
</Modal>

{#if aspect}
	<CropDialog bind:open={cropOpen} {file} {aspect} oncrop={(r) => (crop = r)} />
{/if}
