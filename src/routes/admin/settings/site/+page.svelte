<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ListEditor from '#lib/admin/ListEditor.svelte';
	import { CLINIC_TYPES, MODULE_KEYS, MODULE_LABELS, TYPE_LABELS, type ClinicType } from '#lib/settings/schema.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let clinic = $state(structuredClone(data.values.clinic));
	// svelte-ignore state_referenced_locally
	let labels = $state(structuredClone(data.values.labels));
	// svelte-ignore state_referenced_locally
	let modules = $state(structuredClone(data.values.modules));
	// svelte-ignore state_referenced_locally
	let locationTypes = $state(structuredClone(data.values.locationTypes));
	let errors = $state<Record<string, string>>({});

	const typeNames: Record<ClinicType, string> = {
		dental: 'Dental clinic',
		eye: 'Eye clinic / hospital',
		skin: 'Skin / dermatology',
		general: 'General practice',
		physio: 'Physiotherapy',
		other: 'Other'
	};

	function applyTypeLabels() {
		Object.assign(labels, TYPE_LABELS[clinic.clinicType]);
	}

	const labelFields: Array<[keyof typeof labels, string]> = [
		['doctors', 'Doctors (plural)'],
		['doctor', 'Doctor (singular)'],
		['services', 'Services (plural)'],
		['service', 'Service (singular)'],
		['locations', 'Locations (plural)'],
		['location', 'Location (singular)'],
		['patients', 'Patients (plural)'],
		['patient', 'Patient (singular)'],
		['certifications', 'Certifications'],
		['bookCta', 'Booking button text']
	];
</script>

<PageHeader title="Type, labels & modules" description="Adapt the website to your kind of clinic and switch whole sections on or off." />

<AdminForm payload={{ clinic, labels, modules, locationTypes }} bind:errors>
	<div class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Clinic type</h2>
			<div class="flex flex-wrap items-end gap-3">
				<SelectField
					label="Type"
					bind:value={clinic.clinicType}
					options={CLINIC_TYPES.map((t) => ({ value: t, label: typeNames[t] }))}
					class="min-w-64"
				/>
				<button type="button" class="btn-outline" onclick={applyTypeLabels}>Use suggested wording</button>
			</div>
			<p class="hint">The type controls structured data for search engines (e.g. "Dentist") and suggested wording below.</p>
		</section>

		<section class="card p-5">
			<h2 class="mb-1 font-sans text-lg font-semibold">Wording</h2>
			<p class="mb-4 text-sm text-muted">These words are used everywhere on the website, e.g. "Our Dentists" instead of "Our Doctors".</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each labelFields as [key, label] (key)}
					<TextField {label} bind:value={labels[key]} error={errors[`labels.${key}`]} />
				{/each}
			</div>
		</section>

		<section class="card p-5">
			<h2 class="mb-1 font-sans text-lg font-semibold">Modules</h2>
			<p class="mb-3 text-sm text-muted">Turning a module off hides its pages, menu items and homepage sections.</p>
			<div class="grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
				{#each MODULE_KEYS as key (key)}
					<Toggle label={MODULE_LABELS[key]} bind:checked={modules[key]} />
				{/each}
			</div>
		</section>

		<section class="card p-5">
			<ListEditor label="Location types" bind:items={locationTypes.types} hint="Badges shown on branch cards, e.g. Head Office, Branch." max={12} />
		</section>
	</div>
</AdminForm>
