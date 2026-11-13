<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import Pager from '#lib/admin/Pager.svelte';
	import StatusBadge from '#lib/admin/StatusBadge.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { APPOINTMENT_STATUSES, STATUS_LABELS, TIME_WINDOWS } from '#lib/types.js';
	import { telLink, whatsappLink, fillTemplate } from '#lib/format.js';
	import { formatTime, zonedParts } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const f = $derived(data.filters);

	function setFilter(key: string, value: string) {
		const u = new URL(page.url.href);
		if (value) u.searchParams.set(key, value);
		else u.searchParams.delete(key);
		u.searchParams.delete('page');
		goto(u.pathname + u.search, { replace: true, reset: false });
	}
	const total = $derived(Object.values(data.counts).reduce((a, b) => a + (b ?? 0), 0));

	const fmtCreated = (ms: number) => new Intl.DateTimeFormat(site.clinic.locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: site.clinic.timeZone }).format(ms);
	const fmtDate = (ymd: string) => new Intl.DateTimeFormat(site.clinic.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ymd + 'T00:00:00Z'));
	const when = (r: (typeof data.items)[number]) =>
		r.slotStart ? formatTime(zonedParts(r.slotStart, site.clinic.timeZone).hhmm, site.clinic.locale) : (TIME_WINDOWS[r.timeWindow as keyof typeof TIME_WINDOWS]?.label ?? r.timeWindow);
	const waText = (r: (typeof data.items)[number]) =>
		fillTemplate(data.whatsappTemplate, {
			name: r.patientName.split(' ')[0],
			clinic: site.clinic.name,
			reference: r.reference,
			location: r.locationName,
			date: fmtDate(r.preferredDate),
			doctor: r.doctorName ? `${r.doctorTitle ?? ''} ${r.doctorName}`.trim() : ''
		});

	// Add request by phone
	let addOpen = $state(false);
	let addErrors = $state<Record<string, string>>({});
	const today = new Date().toISOString().slice(0, 10);
	let draft = $state({ locationId: '', doctorId: '', serviceId: '', date: today, timeWindow: 'morning', slot: '', name: '', phone: '', email: '', notes: '', consent: false });
	function openAdd() {
		addErrors = {};
		draft = { locationId: data.locations[0]?.id ?? '', doctorId: '', serviceId: '', date: today, timeWindow: 'morning', slot: '', name: '', phone: '', email: '', notes: '', consent: false };
		addOpen = true;
	}
	const draftDoctors = $derived(data.doctors.filter((d) => d.locationIds.includes(draft.locationId)));
	const exportHref = $derived(`/admin/appointments/export${page.url.search}`);
</script>

<PageHeader title="Appointment requests" description="Call or WhatsApp patients to confirm, then update the status.">
	{#snippet actions()}
		{#if data.slotsEnabled}<a href="/admin/appointments/calendar" class="btn-outline"><Icon name="calendar" size={16} /> Calendar</a>{/if}
		{#if data.canExport}<a href={exportHref} class="btn-outline" download><Icon name="download" size={16} /> Export CSV</a>{/if}
		<button class="btn-primary" onclick={openAdd}><Icon name="plus" size={16} /> Add by phone</button>
	{/snippet}
</PageHeader>

<!-- Status tabs -->
<nav class="-mx-4 mb-4 overflow-x-auto px-4" aria-label="Filter by status">
	<ul class="flex gap-1.5">
		<li><button class="rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap {!f.status ? 'bg-ink text-white' : 'bg-white ring-1 ring-line'}" aria-pressed={!f.status} onclick={() => setFilter('status', '')}>All <span class="opacity-70">{total}</span></button></li>
		{#each APPOINTMENT_STATUSES as s (s)}
			<li>
				<button class="rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap {f.status === s ? 'bg-ink text-white' : 'bg-white ring-1 ring-line'}" aria-pressed={f.status === s} onclick={() => setFilter('status', s)}>
					{STATUS_LABELS[s]} <span class="opacity-70">{data.counts[s] ?? 0}</span>
				</button>
			</li>
		{/each}
	</ul>
</nav>

<!-- Filters -->
<form method="GET" class="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" onsubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const u = new URL(page.url.href); for (const k of ['q', 'location', 'doctor', 'from', 'to']) { const v = String(fd.get(k) ?? ''); if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); } u.searchParams.delete('page'); goto(u.pathname + u.search); }}>
	{#if f.status}<input type="hidden" name="status" value={f.status} />{/if}
	<div class="lg:col-span-2">
		<label class="sr-only" for="q">Search</label>
		<input id="q" name="q" class="input" placeholder="Name, phone or reference" value={f.q ?? ''} />
	</div>
	<div>
		<label class="sr-only" for="fl">Branch</label>
		<select id="fl" name="location" class="input" value={f.locationId ?? ''}>
			<option value="">All branches</option>
			{#each data.locations as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
		</select>
	</div>
	<div>
		<label class="sr-only" for="fd">Doctor</label>
		<select id="fd" name="doctor" class="input" value={f.doctorId ?? ''}>
			<option value="">All doctors</option>
			<option value="none">No preference</option>
			{#each data.doctors as d (d.id)}<option value={d.id}>{d.title} {d.name}</option>{/each}
		</select>
	</div>
	<div class="flex gap-2 lg:col-span-2">
		<label class="sr-only" for="from">From date</label>
		<input id="from" name="from" type="date" class="input" value={f.from ?? ''} />
		<label class="sr-only" for="to">To date</label>
		<input id="to" name="to" type="date" class="input" value={f.to ?? ''} />
		<button class="btn-outline shrink-0">Apply</button>
	</div>
</form>

<!-- List -->
<div class="card overflow-hidden">
	{#if !data.items.length}
		<p class="px-4 py-12 text-center text-muted">No appointment requests match.</p>
	{:else}
		<ul class="divide-y divide-line">
			{#each data.items as r (r.id)}
				<li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-gray-50">
					<a href="/admin/appointments/{r.id}" class="min-w-0 flex-1 basis-64">
						<span class="flex flex-wrap items-center gap-2">
							<span class="font-semibold">{r.patientName}</span>
							<StatusBadge status={r.status} />
							{#if r.source !== 'web'}<span class="text-xs text-muted">via {r.source}</span>{/if}
						</span>
						<span class="mt-0.5 block text-sm text-muted">
							<span class="font-medium text-ink">{fmtDate(r.preferredDate)} · {when(r)}</span>
							· {r.locationName}{r.doctorName ? ` · ${r.doctorTitle ?? ''} ${r.doctorName}` : ''}{r.serviceName ? ` · ${r.serviceName}` : ''}
						</span>
						<span class="block text-xs text-muted">{r.reference} · received {fmtCreated(r.createdAt)}</span>
					</a>
					<div class="flex gap-2">
						<a href={telLink(r.phone)} class="btn-outline btn-sm" aria-label="Call {r.patientName}"><Icon name="phone" size={16} /><span class="hidden sm:inline">{r.phone}</span></a>
						<a href={whatsappLink(r.phone, waText(r))} target="_blank" rel="noopener" class="btn-outline btn-sm" aria-label="WhatsApp {r.patientName}"><Icon name="whatsapp" size={16} /></a>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
<Pager page={data.page} hasMore={data.hasMore} />

<Modal bind:open={addOpen} title="Add a request taken by phone" size="lg">
	<AdminForm
		action="?/create"
		payload={{ ...draft, consent: draft.consent ? 'true' : '' }}
		bind:errors={addErrors}
		bare
		successMessage="Request added"
		onsuccess={(d) => {
			addOpen = false;
			if (d?.id) goto(`/admin/appointments/${d.id}`);
		}}
	>
		<div class="grid gap-4 sm:grid-cols-2">
			<TextField label="Patient name" bind:value={draft.name} required error={addErrors.name} />
			<TextField label="Mobile number" type="tel" bind:value={draft.phone} required error={addErrors.phone} />
			<SelectField label="Branch" bind:value={draft.locationId} options={data.locations.map((l) => ({ value: l.id, label: l.name }))} error={addErrors.locationId} />
			<SelectField label="Doctor" bind:value={draft.doctorId} placeholder="No preference" options={draftDoctors.map((d) => ({ value: d.id, label: `${d.title ?? ''} ${d.name}`.trim() }))} error={addErrors.doctorId} />
			<TextField label="Date" type="date" bind:value={draft.date} error={addErrors.date} />
			<SelectField label="Time of day" bind:value={draft.timeWindow} options={Object.entries(TIME_WINDOWS).map(([value, w]) => ({ value, label: w.label }))} error={addErrors.timeWindow} />
			<SelectField label="Service" bind:value={draft.serviceId} placeholder="—" options={data.services.map((s) => ({ value: s.id, label: s.name }))} error={addErrors.serviceId} />
			<TextField label="Email (optional)" type="email" bind:value={draft.email} error={addErrors.email} />
			<TextField label="Notes" type="textarea" rows={2} bind:value={draft.notes} class="sm:col-span-2" />
			<label class="flex items-start gap-2 text-sm sm:col-span-2">
				<input type="checkbox" bind:checked={draft.consent} class="mt-0.5 rounded text-primary" />
				<span>The patient agreed on the phone to us storing these details to arrange the appointment.</span>
			</label>
			{#if addErrors.consent}<p class="field-error sm:col-span-2">Please confirm the patient's consent.</p>{/if}
		</div>
		<div class="mt-5 flex justify-end border-t border-line pt-4"><button class="btn-primary">Add request</button></div>
	</AdminForm>
</Modal>
