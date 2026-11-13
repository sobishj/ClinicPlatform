<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import PdfField from '#lib/admin/PdfField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ImageRef } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	type Cert = {
		id?: string;
		title: string;
		issuer: string | null;
		year: number | null;
		image: ImageRef | null;
		description: string | null;
		pdfUrl: string | null;
		active: boolean;
	};
	let editing = $state<Cert | null>(null);
	let open = $state(false);
	let errors = $state<Record<string, string>>({});

	function edit(item?: (typeof data.items)[number]) {
		errors = {};
		editing = item
			? { id: item.id, title: item.title, issuer: item.issuer, year: item.year, image: item.image, description: item.description, pdfUrl: item.pdfUrl, active: item.active }
			: { title: '', issuer: '', year: new Date().getFullYear(), image: null, description: '', pdfUrl: null, active: true };
		open = true;
	}
</script>

<PageHeader title={data.site.labels.certifications} description="Accreditations, memberships and awards. Shown on the homepage and the certifications page.">
	{#snippet actions()}
		{#if data.canWrite}<button class="btn-primary" onclick={() => edit()}><Icon name="plus" size={16} /> Add certification</button>{/if}
	{/snippet}
</PageHeader>

<AdminList
	items={data.items}
	canWrite={data.canWrite}
	title={(i) => i.title}
	subtitle={(i) => [i.issuer, i.year].filter(Boolean).join(' · ')}
	image={(i) => i.image?.url}
	onedit={edit}
	empty="No certifications yet."
/>

<Modal bind:open title={editing?.id ? 'Edit certification' : 'Add certification'} size="lg">
	{#if editing}
		<AdminForm payload={editing} bind:errors bare onsuccess={() => (open = false)}>
			<div class="space-y-4">
				<TextField label="Title" bind:value={editing.title} required error={errors.title} />
				<div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
					<TextField label="Issuing body" bind:value={editing.issuer} />
					<TextField label="Year" type="number" bind:value={editing.year} min={1900} max={2100} />
				</div>
				<ImageField label="Logo or certificate image" bind:value={editing.image} maxWidth={800} previewClass="aspect-square" error={errors['image.alt']} />
				<TextField label="Description" type="textarea" rows={3} bind:value={editing.description} />
				<PdfField label="Certificate PDF (optional)" bind:value={editing.pdfUrl} />
				<Toggle label="Active" bind:checked={editing.active} />
				<div class="flex justify-end border-t border-line pt-4"><button class="btn-primary">Save</button></div>
			</div>
		</AdminForm>
	{/if}
</Modal>
