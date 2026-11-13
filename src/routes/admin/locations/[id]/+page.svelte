<script lang="ts">
	import { page } from '$app/state';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ListEditor from '#lib/admin/ListEditor.svelte';
	import HoursEditor from '#lib/admin/HoursEditor.svelte';
	import DateRangesEditor from '#lib/admin/DateRangesEditor.svelte';
	import GalleryField from '#lib/admin/GalleryField.svelte';
	import MapField from '#lib/admin/MapField.svelte';
	import CheckboxList from '#lib/admin/CheckboxList.svelte';
	import RichTextEditor from '#lib/admin/RichTextEditor.svelte';
	import SeoFields from '#lib/admin/SeoFields.svelte';
	import { slugify } from '#lib/slug.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let loc = $state(structuredClone(data.location));
	let errors = $state<Record<string, string>>({});
	const labels = $derived(data.site.labels);
	const hoursErrors = $derived(
		Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('hours.')).map(([k, v]) => [k.slice(6), v]))
	);
	const closureErrors = $derived(
		Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('closures.')).map(([k, v]) => [k.slice(9).split('.')[0], v]))
	);
</script>

<PageHeader title={data.isNew ? `Add ${labels.location.toLowerCase()}` : loc.name} back={{ href: '/admin/locations', label: labels.locations }}>
	{#snippet actions()}
		{#if !data.isNew && loc.slug}<a href="/locations/{loc.slug}" target="_blank" rel="noopener" class="btn-outline btn-sm">View on website</a>{/if}
	{/snippet}
</PageHeader>

{#if page.url.searchParams.has('created')}
	<p class="mb-4 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">Created. You can keep editing below.</p>
{/if}

<AdminForm payload={loc} bind:errors submitLabel={data.isNew ? `Create ${labels.location.toLowerCase()}` : 'Save changes'}>
	<fieldset disabled={!data.canWrite} class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Basics</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField label="Name" bind:value={loc.name} required error={errors.name} hint="Usually the area, e.g. Kakkanad" />
				<TextField label="URL slug" bind:value={loc.slug} placeholder={slugify(loc.name)} error={errors.slug} hint="/locations/{loc.slug || slugify(loc.name) || '…'}" />
				<SelectField label="Type" bind:value={loc.type} options={data.types} />
				<SelectField
					label="Parent branch (optional)"
					bind:value={loc.parentId}
					placeholder="— None —"
					options={data.parents.map((p) => ({ value: p.id, label: p.name }))}
				/>
				<TextField label="Short summary" type="textarea" rows={2} bind:value={loc.summary} class="sm:col-span-2" maxlength={300} hint="Shown on branch cards." />
			</div>
			<Toggle label="Active" description="Inactive branches are hidden from the website and booking." bind:checked={loc.active} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Address & contact</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField label="Address line 1" bind:value={loc.addressLine1} required error={errors.addressLine1} class="sm:col-span-2" />
				<TextField label="Address line 2" bind:value={loc.addressLine2} class="sm:col-span-2" />
				<TextField label="Area / locality" bind:value={loc.area} />
				<TextField label="City" bind:value={loc.city} required error={errors.city} />
				<TextField label="State" bind:value={loc.state} />
				<TextField label="PIN code" bind:value={loc.postalCode} />
			</div>
			<ListEditor label="Phone numbers" bind:items={loc.phones} placeholder="+91 484 000 0000" max={5} />
			<div class="grid gap-4 sm:grid-cols-3">
				<TextField label="WhatsApp" type="tel" bind:value={loc.whatsapp} />
				<TextField label="Public email" type="email" bind:value={loc.email} error={errors.email} />
				<TextField label="Notification email" type="email" bind:value={loc.notificationEmail} error={errors.notificationEmail} hint="Receives new appointment requests" />
			</div>
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Map</h2>
			<MapField bind:embedUrl={loc.mapEmbedUrl} bind:directionsUrl={loc.directionsUrl} bind:latitude={loc.latitude} bind:longitude={loc.longitude} error={errors.mapEmbedUrl} />
		</section>

		<section class="card space-y-5 p-5">
			<h2 class="font-sans text-lg font-semibold">Opening hours</h2>
			<HoursEditor bind:value={loc.hours} errors={hoursErrors} />
			<DateRangesEditor
				label="Holidays & closures"
				bind:items={loc.closures}
				hint="The branch shows as closed and cannot be booked on these dates."
				reasonPlaceholder="e.g. Onam"
				errors={closureErrors}
			/>
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Photos & description</h2>
			<GalleryField label="Photos" bind:items={loc.photos} hint="The first photo is used on branch cards. Add the entrance so patients can recognise it." />
			<RichTextEditor label="Description" bind:value={() => loc.description ?? '', (v) => (loc.description = v)} hint="Parking, landmarks, accessibility…" />
		</section>

		<section class="card space-y-4 p-5">
			<CheckboxList
				label="{labels.services} offered here"
				bind:selected={loc.serviceIds}
				options={data.services.map((s) => ({ value: s.id, label: s.name, hint: s.category ?? undefined }))}
				columns={3}
			/>
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Booking</h2>
			<SelectField
				label="Booking mode for this branch"
				bind:value={loc.bookingMode}
				options={[
					{ value: 'inherit', label: 'Use the clinic setting' },
					{ value: 'request', label: 'Appointment request (staff call back)' },
					{ value: 'slots', label: 'Live time slots' }
				]}
				hint="Live slots need each doctor's schedule at this branch."
			/>
		</section>

		<SeoFields bind:value={loc.seo} fallbackTitle={loc.name} />
	</fieldset>
</AdminForm>
