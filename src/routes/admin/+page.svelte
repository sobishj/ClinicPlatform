<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import { can } from '#lib/permissions.js';
	import { whatsappLink, telLink } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const labels = $derived(data.site.labels);
	const canWrite = $derived(can(data.user, 'content:write'));

	const quick = $derived([
		{ href: '/admin/slides', label: 'Hero slides', icon: 'image', count: data.counts.slides },
		{ href: '/admin/locations', label: labels.locations, icon: 'map-pin', count: data.counts.locations },
		{ href: '/admin/doctors', label: labels.doctors, icon: 'stethoscope', count: data.counts.doctors },
		{ href: '/admin/services', label: labels.services, icon: 'layers', count: data.counts.services },
		{ href: '/admin/certifications', label: labels.certifications, icon: 'award', count: data.counts.certifications }
	]);
	const fmt = (ms: number) =>
		new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.site.clinic.timeZone }).format(ms);
</script>

<PageHeader title="Hello, {data.user?.name.split(' ')[0]}" description="Edit your website content and follow up on appointment requests.">
	{#snippet actions()}
		<a href="/" target="_blank" rel="noopener" class="btn-primary"><Icon name="external-link" size={16} /> View website</a>
	{/snippet}
</PageHeader>

{#if can(data.user, 'appointments:read')}
	<section class="card mb-6 p-5">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h2 class="font-sans text-lg font-semibold">
				New requests waiting for a call back
				<span class="ml-2 rounded-full bg-accent-100 px-2.5 py-0.5 text-sm text-accent-700">{data.newCount}</span>
			</h2>
			<a href="/admin/appointments?status=new" class="btn-outline btn-sm">View all</a>
		</div>
		{#if !data.newRequests.length}
			<p class="text-sm text-muted">All caught up — no new requests.</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each data.newRequests as r (r.id)}
					<li class="flex flex-wrap items-center gap-3 py-3">
						<a href="/admin/appointments/{r.id}" class="min-w-0 flex-1">
							<p class="font-medium">{r.patientName} <span class="text-sm text-muted">· {r.reference}</span></p>
							<p class="text-sm text-muted">{r.locationName} · {r.preferredDate} · {r.timeWindow} · received {fmt(r.createdAt)}</p>
						</a>
						<a href={telLink(r.phone)} class="btn-outline btn-sm"><Icon name="phone" size={16} /> Call</a>
						<a href={whatsappLink(r.phone)} target="_blank" rel="noopener" class="btn-outline btn-sm"><Icon name="whatsapp" size={16} /> WhatsApp</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<section>
	<h2 class="mb-3 font-sans text-lg font-semibold">Website content</h2>
	<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each quick as q (q.href)}
			<li>
				<a href={q.href} class="card flex items-center gap-4 p-4 hover:border-primary">
					<span class="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-800"><Icon name={q.icon} /></span>
					<span class="flex-1">
						<span class="block font-semibold">{q.label}</span>
						<span class="text-sm text-muted">{q.count} {q.count === 1 ? 'item' : 'items'}</span>
					</span>
					<Icon name="chevron-right" class="text-muted" />
				</a>
			</li>
		{/each}
		{#if canWrite}
			<li>
				<a href="/admin/homepage" class="card flex items-center gap-4 p-4 hover:border-primary">
					<span class="flex size-11 items-center justify-center rounded-xl bg-accent-100 text-accent-700"><Icon name="house" /></span>
					<span class="flex-1"><span class="block font-semibold">Homepage sections</span><span class="text-sm text-muted">Order, headings, banner</span></span>
					<Icon name="chevron-right" class="text-muted" />
				</a>
			</li>
		{/if}
	</ul>
</section>
