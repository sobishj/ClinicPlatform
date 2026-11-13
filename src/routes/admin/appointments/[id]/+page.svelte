<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import StatusBadge from '#lib/admin/StatusBadge.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { APPOINTMENT_STATUSES, STATUS_LABELS, TIME_WINDOWS } from '#lib/types.js';
	import { telLink, whatsappLink, fillTemplate } from '#lib/format.js';
	import { formatTime, zonedParts } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const d = $derived(data.d);
	const a = $derived(d.a);

	// svelte-ignore state_referenced_locally
	let form = $state({ status: data.d.a.status, preferredDate: data.d.a.preferredDate, timeWindow: data.d.a.timeWindow, doctorId: data.d.a.doctorId, note: '', notifyPatient: true });
	let errors = $state<Record<string, string>>({});
	let note = $state({ note: '' });
	let noteErrors = $state<Record<string, string>>({});

	const fmt = (ms: number) => new Intl.DateTimeFormat(site.clinic.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: site.clinic.timeZone }).format(ms);
	const dateLong = (ymd: string) => new Intl.DateTimeFormat(site.clinic.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ymd + 'T00:00:00Z'));
	const doctorLabel = $derived(d.doctor ? `${d.doctor.title ?? ''} ${d.doctor.name}`.trim() : 'No preference');
	const waText = $derived(
		fillTemplate(data.whatsappTemplate, { name: a.patientName.split(' ')[0], clinic: site.clinic.name, reference: a.reference, location: d.locationName, date: dateLong(a.preferredDate), doctor: d.doctor ? doctorLabel : '' })
	);
	const windowOptions = $derived([
		...Object.entries(TIME_WINDOWS).map(([value, w]) => ({ value, label: w.label })),
		...(a.slotStart ? [{ value: 'slot', label: `Booked time ${formatTime(zonedParts(a.slotStart, site.clinic.timeZone).hhmm, site.clinic.locale)}` }] : [])
	]);
</script>

<PageHeader title={a.patientName} back={{ href: '/admin/appointments', label: 'Appointments' }}>
	{#snippet actions()}
		<a href={telLink(a.phone)} class="btn-primary"><Icon name="phone" size={18} /> Call {a.phone}</a>
		<a href={whatsappLink(a.phone, waText)} target="_blank" rel="noopener" class="btn-outline"><Icon name="whatsapp" size={18} /> WhatsApp</a>
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-[1fr_24rem]">
	<div class="space-y-6">
		<section class="card p-5">
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<StatusBadge status={a.status} />
				<span class="font-mono text-sm">{a.reference}</span>
				<span class="text-sm text-muted">via {a.source} · received {fmt(a.createdAt)}</span>
			</div>
			<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div><dt class="text-muted">Preferred</dt><dd class="font-medium">{dateLong(a.preferredDate)} · {a.slotStart ? formatTime(zonedParts(a.slotStart, site.clinic.timeZone).hhmm, site.clinic.locale) : (TIME_WINDOWS[a.timeWindow as keyof typeof TIME_WINDOWS]?.label ?? a.timeWindow)}</dd></div>
				<div><dt class="text-muted">Branch</dt><dd class="font-medium">{d.locationName}</dd></div>
				<div><dt class="text-muted">{site.labels.doctor}</dt><dd class="font-medium">{doctorLabel}</dd></div>
				<div><dt class="text-muted">{site.labels.service}</dt><dd class="font-medium">{d.service?.name ?? '—'}</dd></div>
				<div><dt class="text-muted">Phone</dt><dd class="font-medium"><a href={telLink(a.phone)} class="hover:underline">{a.phone}</a></dd></div>
				<div><dt class="text-muted">Email</dt><dd class="font-medium break-all">{#if a.email}<a href="mailto:{a.email}" class="hover:underline">{a.email}</a>{:else}—{/if}</dd></div>
				{#if a.notes}<div class="sm:col-span-2"><dt class="text-muted">Patient's notes</dt><dd class="whitespace-pre-wrap">{a.notes}</dd></div>{/if}
				<div class="sm:col-span-2"><dt class="text-muted">Consent recorded</dt><dd>{fmt(a.consentAt)}</dd></div>
			</dl>
		</section>

		<section class="card p-5">
			<h2 class="mb-4 font-sans text-lg font-semibold">History & notes</h2>
			{#if data.notes.length}
				<ol class="mb-5 space-y-3 border-l-2 border-line pl-4">
					{#each data.notes as n (n.id)}
						<li>
							<p class="text-xs text-muted">{fmt(n.createdAt)} · {n.userName ?? 'system'}</p>
							<p class="text-sm whitespace-pre-wrap">{n.note}</p>
						</li>
					{/each}
				</ol>
			{:else}<p class="mb-4 text-sm text-muted">No notes yet.</p>{/if}
			<AdminForm action="?/note" payload={note} bind:errors={noteErrors} bare successMessage="Note added" onsuccess={() => (note.note = '')}>
				<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
					<div class="flex-1"><TextField label="Add a note" type="textarea" rows={2} bind:value={note.note} error={noteErrors.note} /></div>
					<button class="btn-outline">Add note</button>
				</div>
			</AdminForm>
		</section>
	</div>

	<aside>
		<AdminForm action="?/update" payload={form} bind:errors bare successMessage="Appointment updated" onsuccess={() => (form.note = '')}>
			<div class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Update</h2>
				<fieldset>
					<legend class="label">Status</legend>
					<div class="grid grid-cols-2 gap-2">
						{#each APPOINTMENT_STATUSES as s (s)}
							<label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-50">
								<input type="radio" value={s} bind:group={form.status} class="text-primary" /> {STATUS_LABELS[s]}
							</label>
						{/each}
					</div>
				</fieldset>
				<TextField label="Date" type="date" bind:value={form.preferredDate} error={errors.preferredDate} />
				<SelectField label="Time" bind:value={form.timeWindow} options={windowOptions} error={errors.timeWindow} />
				<SelectField label={site.labels.doctor} bind:value={form.doctorId} placeholder="No preference" options={data.doctors.map((x) => ({ value: x.id, label: `${x.title ?? ''} ${x.name}`.trim() }))} />
				<TextField label="Note (optional)" type="textarea" rows={2} bind:value={form.note} />
				{#if a.email}<Toggle label="Email the patient about this change" bind:checked={form.notifyPatient} />{/if}
				<button class="btn-primary w-full">Save</button>
			</div>
		</AdminForm>
	</aside>
</div>
