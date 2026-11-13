<script lang="ts">
	import { page } from '$app/state';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ListEditor from '#lib/admin/ListEditor.svelte';
	import HoursEditor from '#lib/admin/HoursEditor.svelte';
	import DateRangesEditor from '#lib/admin/DateRangesEditor.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import CheckboxList from '#lib/admin/CheckboxList.svelte';
	import RichTextEditor from '#lib/admin/RichTextEditor.svelte';
	import SeoFields from '#lib/admin/SeoFields.svelte';
	import { slugify } from '#lib/slug.js';
	import type { WeeklyHours } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let doc = $state(structuredClone(data.doctor));
	let errors = $state<Record<string, string>>({});
	const labels = $derived(data.site.labels);

	// Branch selection ↔ per-branch schedule rows.
	let selectedBranches = $state(doc.branches.map((b) => b.locationId));
	$effect(() => {
		const current = new Map(doc.branches.map((b) => [b.locationId, b]));
		const next = data.locations
			.filter((l) => selectedBranches.includes(l.id))
			.map((l) => current.get(l.id) ?? { locationId: l.id, schedule: {} as WeeklyHours, bookable: true });
		if (next.length !== doc.branches.length || next.some((b, i) => b.locationId !== doc.branches[i]?.locationId)) doc.branches = next;
	});
	const locName = (id: string) => data.locations.find((l) => l.id === id)?.name ?? '';
	const locHours = (id: string) => data.locations.find((l) => l.id === id)?.hours ?? {};
</script>

<PageHeader title={data.isNew ? `Add ${labels.doctor.toLowerCase()}` : `${doc.title} ${doc.name}`} back={{ href: '/admin/doctors', label: labels.doctors }}>
	{#snippet actions()}
		{#if !data.isNew}<a href="/doctors/{doc.slug}" target="_blank" rel="noopener" class="btn-outline btn-sm">View on website</a>{/if}
	{/snippet}
</PageHeader>

{#if page.url.searchParams.has('created')}
	<p class="mb-4 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">Created. You can keep editing below.</p>
{/if}

<AdminForm payload={doc} bind:errors submitLabel={data.isNew ? 'Create profile' : 'Save changes'}>
	<fieldset disabled={!data.canWrite} class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Profile</h2>
			<div class="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
				<TextField label="Title" bind:value={doc.title} placeholder="Dr." />
				<TextField label="Full name" bind:value={doc.name} required error={errors.name} />
				<TextField label="URL slug" bind:value={doc.slug} placeholder={slugify(doc.name)} error={errors.slug} />
			</div>
			<div class="grid gap-4 sm:grid-cols-3">
				<TextField label="Qualifications" bind:value={doc.qualifications} placeholder="BDS, MDS (Orthodontics)" class="sm:col-span-2" />
				<TextField label="Years of experience" type="number" bind:value={doc.experienceYears} min={0} max={70} />
				<TextField label="Registration number" bind:value={doc.registrationNumber} hint="State council registration" />
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<ListEditor label="Specialities" bind:items={doc.specialities} placeholder="e.g. Orthodontist" max={10} />
				<ListEditor label="Languages" bind:items={doc.languages} placeholder="e.g. Malayalam" max={12} />
			</div>
			<TextField label="Short summary" type="textarea" rows={2} bind:value={doc.summary} maxlength={400} hint="One or two sentences for cards." />
			<RichTextEditor label="Biography" bind:value={doc.bio} />
			<div class="flex flex-wrap gap-x-10">
				<Toggle label="Feature on homepage" bind:checked={doc.featured} />
				<Toggle label="Active (shown on website)" bind:checked={doc.active} />
			</div>
		</section>

		<section class="card space-y-5 p-5">
			<h2 class="font-sans text-lg font-semibold">Photos</h2>
			<p class="-mt-3 text-sm text-muted">Upload once for each shape — you can crop in the browser. Photos are resized to 800px.</p>
			<div class="grid gap-6 lg:grid-cols-2">
				<ImageField label="Square photo (cards)" bind:value={doc.photo} aspect={1} maxWidth={800} previewClass="aspect-square" error={errors['photo.alt']} />
				<ImageField label="Portrait photo (profile page)" bind:value={doc.photoPortrait} aspect={0.8} maxWidth={800} previewClass="aspect-[4/5]" hint="Optional — the square photo is used if empty." error={errors['photoPortrait.alt']} />
			</div>
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">{labels.locations} & schedule</h2>
			<CheckboxList label="Works at" bind:selected={selectedBranches} options={data.locations.map((l) => ({ value: l.id, label: l.name }))} columns={3} empty="Add a location first." />
			{#each doc.branches as b (b.locationId)}
				<details class="rounded-lg border border-line" open={doc.branches.length <= 2}>
					<summary class="cursor-pointer px-4 py-3 font-medium">
						{locName(b.locationId)}
						<span class="ml-2 text-sm font-normal text-muted">{Object.values(b.schedule).filter((r) => r?.length).length} day(s) a week</span>
					</summary>
					<div class="space-y-3 border-t border-line p-4">
						<Toggle label="Patients can book with this {labels.doctor.toLowerCase()} here" bind:checked={b.bookable} />
						<HoursEditor label="Days and times at {locName(b.locationId)}" bind:value={b.schedule} />
						<button type="button" class="btn-ghost btn-sm" onclick={() => (b.schedule = structuredClone(locHours(b.locationId)))}>Copy branch opening hours</button>
					</div>
				</details>
			{/each}
			<DateRangesEditor label="Leave / unavailable dates" bind:items={doc.leaves} hint="Not bookable on these dates at any branch." reasonPlaceholder="e.g. Conference" />
		</section>

		<section class="card p-5">
			<CheckboxList label="{labels.services} performed" bind:selected={doc.serviceIds} options={data.services.map((s) => ({ value: s.id, label: s.name, hint: s.category ?? undefined }))} columns={3} />
		</section>

		<SeoFields bind:value={doc.seo} fallbackTitle="{doc.title} {doc.name}" />
	</fieldset>
</AdminForm>
