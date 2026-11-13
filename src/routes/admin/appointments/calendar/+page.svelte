<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import StatusBadge from '#lib/admin/StatusBadge.svelte';
	import { TIME_WINDOWS } from '#lib/types.js';
	import { formatTime, zonedParts } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);
	const fmtDay = (ymd: string) => new Intl.DateTimeFormat(site.clinic.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ymd + 'T00:00:00Z'));
	const today = new Date().toISOString().slice(0, 10);
	const q = (week: string) => `?week=${week}${data.locationId ? `&location=${data.locationId}` : ''}`;
</script>

<PageHeader title="Calendar" description="This week's appointments by day. Cancelled requests are hidden." back={{ href: '/admin/appointments', label: 'Appointments' }}>
	{#snippet actions()}
		<a href={q(data.prev)} class="btn-outline btn-sm">← Previous week</a>
		<a href="?" class="btn-outline btn-sm">This week</a>
		<a href={q(data.next)} class="btn-outline btn-sm">Next week →</a>
	{/snippet}
</PageHeader>

<div class="grid gap-3 md:grid-cols-7">
	{#each data.days as day (day.ymd)}
		<section class="card min-h-32 p-3 {day.ymd === today ? 'ring-2 ring-primary' : ''}" aria-label={fmtDay(day.ymd)}>
			<h2 class="mb-2 font-sans text-sm font-semibold">{fmtDay(day.ymd)}</h2>
			<ul class="space-y-2">
				{#each day.items as a (a.id)}
					<li>
						<a href="/admin/appointments/{a.id}" class="block rounded-lg border border-line p-2 text-xs hover:border-primary">
							<span class="font-semibold">{a.slotStart ? formatTime(zonedParts(a.slotStart, site.clinic.timeZone).hhmm, site.clinic.locale) : TIME_WINDOWS[a.timeWindow as keyof typeof TIME_WINDOWS]?.label}</span>
							<span class="block truncate">{a.patientName}</span>
							<span class="block truncate text-muted">{a.locationName}{a.doctorName ? ` · ${a.doctorName}` : ''}</span>
							<span class="mt-1 block"><StatusBadge status={a.status} /></span>
						</a>
					</li>
				{:else}
					<li class="text-xs text-muted">—</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
