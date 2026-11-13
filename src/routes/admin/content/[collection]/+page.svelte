<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import CollectionField from '#lib/admin/CollectionField.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { emptyRecord, type CollectionKey } from '#lib/content/collections.js';
	import type { ImageRef } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const def = $derived(data.def);

	let editing = $state<{ id?: string; active: boolean; data: Record<string, unknown> } | null>(null);
	let open = $state(false);
	let errors = $state<Record<string, string>>({});

	function edit(item?: (typeof data.items)[number]) {
		errors = {};
		editing = item
			? { id: item.id, active: item.active, data: { ...emptyRecord(def.key as CollectionKey), ...structuredClone(item.data) } }
			: { active: true, data: emptyRecord(def.key as CollectionKey) };
		open = true;
	}
	const titleOf = (i: { data: Record<string, unknown> }) => String(i.data[def.titleField] ?? '') || '(untitled)';
	const imageOf = (i: { data: Record<string, unknown> }) => (i.data.image as ImageRef | null)?.url;
	const hasImage = $derived(def.fields.some((f) => f.type === 'image'));
	const subtitleOf = (i: { data: Record<string, unknown> }) => {
		const f = def.fields.find((x) => x.name !== def.titleField && (x.type === 'textarea' || x.type === 'richtext' || x.type === 'text'));
		return f ? String(i.data[f.name] ?? '').replace(/<[^>]+>/g, ' ').slice(0, 120) : '';
	};
</script>

<PageHeader title={def.label} description={def.description} back={{ href: '/admin/content', label: 'Content blocks' }}>
	{#snippet actions()}
		<button class="btn-primary" onclick={() => edit()}><Icon name="plus" size={16} /> Add {def.singular.toLowerCase()}</button>
	{/snippet}
</PageHeader>

<AdminList items={data.items} canWrite={true} title={titleOf} subtitle={subtitleOf} image={hasImage ? imageOf : undefined} onedit={edit} empty="Nothing here yet." />

<Modal bind:open title="{editing?.id ? 'Edit' : 'Add'} {def.singular.toLowerCase()}" size="lg">
	{#if editing}
		<AdminForm payload={editing} bind:errors bare onsuccess={() => (open = false)}>
			<div class="space-y-4">
				{#each def.fields as field (field.name)}
					<CollectionField {field} bind:record={editing.data} error={errors[`data.${field.name}`] ?? errors[`data.${field.name}.alt`]} />
				{/each}
				<Toggle label="Active (shown on website)" bind:checked={editing.active} />
				<div class="flex justify-end border-t border-line pt-4"><button class="btn-primary">Save</button></div>
			</div>
		</AdminForm>
	{/if}
</Modal>
