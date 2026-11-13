<script lang="ts">
	import { page } from '$app/state';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ListEditor from '#lib/admin/ListEditor.svelte';
	import PairListEditor from '#lib/admin/PairListEditor.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import IconPicker from '#lib/admin/IconPicker.svelte';
	import CheckboxList from '#lib/admin/CheckboxList.svelte';
	import RichTextEditor from '#lib/admin/RichTextEditor.svelte';
	import SeoFields from '#lib/admin/SeoFields.svelte';
	import { slugify } from '#lib/slug.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let svc = $state(structuredClone(data.service));
	let errors = $state<Record<string, string>>({});
	const labels = $derived(data.site.labels);
	const firstError = (prefix: string) => Object.entries(errors).find(([k]) => k.startsWith(prefix))?.[1];
</script>

<PageHeader title={data.isNew ? `Add ${labels.service.toLowerCase()}` : svc.name} back={{ href: '/admin/services', label: labels.services }}>
	{#snippet actions()}
		{#if !data.isNew}<a href="/services/{svc.slug}" target="_blank" rel="noopener" class="btn-outline btn-sm">View on website</a>{/if}
	{/snippet}
</PageHeader>

{#if page.url.searchParams.has('created')}
	<p class="mb-4 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">Created. You can keep editing below.</p>
{/if}

<AdminForm payload={svc} bind:errors submitLabel={data.isNew ? 'Create' : 'Save changes'}>
	<fieldset disabled={!data.canWrite} class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Basics</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField label="Name" bind:value={svc.name} required error={errors.name} />
				<TextField label="URL slug" bind:value={svc.slug} placeholder={slugify(svc.name)} error={errors.slug} />
				<div>
					<label class="label" for="cat">Category</label>
					<input id="cat" class="input" list="cats" bind:value={svc.category} placeholder="e.g. Cosmetic" />
					<datalist id="cats">{#each data.categories as c (c)}<option value={c}></option>{/each}</datalist>
					<p class="hint">Services are grouped by category in the menu.</p>
				</div>
				<IconPicker bind:value={svc.icon} />
			</div>
			<TextField label="Short description" type="textarea" rows={2} bind:value={svc.summary} maxlength={400} hint="Shown on cards and in search results." />
			<div class="grid gap-4 sm:grid-cols-3">
				<TextField label="Duration (minutes)" type="number" bind:value={svc.durationMinutes} min={5} hint="Used for live time slots" />
				<TextField label="Price ({data.site.clinic.currency})" type="number" bind:value={svc.price} min={0} hint="Optional" />
				<div class="pt-7"><Toggle label='Show as "from" price' bind:checked={svc.priceFrom} /></div>
			</div>
			<Toggle label="Active (shown on website)" bind:checked={svc.active} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Page content</h2>
			<ImageField label="Image" bind:value={svc.image} maxWidth={1600} error={errors['image.alt']} />
			<RichTextEditor label="Description" bind:value={svc.content} minHeight="14rem" />
			<ListEditor label="Benefits" bind:items={svc.benefits} placeholder="e.g. Usually one visit" max={20} />
			<PairListEditor label="Procedure steps" bind:items={svc.steps} first={{ key: 'title', label: 'Step' }} second={{ key: 'description', label: 'What happens', multiline: true }} addLabel="Add step" />
			{#if firstError('steps')}<p class="field-error">{firstError('steps')}</p>{/if}
			<PairListEditor label="FAQs" bind:items={svc.faqs} first={{ key: 'question', label: 'Question' }} second={{ key: 'answer', label: 'Answer', multiline: true }} addLabel="Add question" />
			{#if firstError('faqs')}<p class="field-error">{firstError('faqs')}</p>{/if}
		</section>

		<section class="card grid gap-6 p-5 lg:grid-cols-2">
			<CheckboxList label="Offered at" bind:selected={svc.locationIds} options={data.locations.map((l) => ({ value: l.id, label: l.name }))} columns={1} />
			<CheckboxList label="Performed by" bind:selected={svc.doctorIds} options={data.doctors.map((d) => ({ value: d.id, label: `${d.title ?? ''} ${d.name}`.trim() }))} columns={1} />
		</section>

		<SeoFields bind:value={svc.seo} fallbackTitle={svc.name} />
	</fieldset>
</AdminForm>
