<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import Pager from '#lib/admin/Pager.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const entities = ['settings', 'location', 'doctor', 'service', 'certification', 'slide', 'block', 'page', 'media', 'appointment', 'user', 'api_key', 'webhook'];
	const fmt = (ms: number) =>
		new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.site.clinic.timeZone }).format(ms);
</script>

<PageHeader title="Audit log" description="Every change made in the admin panel or through the API: who, what and when." />

<form class="mb-4 flex flex-wrap gap-2" method="GET">
	<label class="sr-only" for="q">Search</label>
	<input id="q" name="q" class="input max-w-xs" placeholder="Search user or summary" value={data.q} />
	<label class="sr-only" for="entity">Type</label>
	<select id="entity" name="entity" class="input max-w-48" value={data.entity}>
		<option value="">All types</option>
		{#each entities as e (e)}<option value={e}>{e}</option>{/each}
	</select>
	<button class="btn-outline">Filter</button>
</form>

<div class="card overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead class="border-b border-line bg-gray-50 text-xs text-muted uppercase">
			<tr><th class="px-4 py-3">When</th><th class="px-4 py-3">Who</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">What</th></tr>
		</thead>
		<tbody class="divide-y divide-line">
			{#each data.rows as r (r.id)}
				<tr>
					<td class="px-4 py-2.5 whitespace-nowrap text-muted">{fmt(r.createdAt)}</td>
					<td class="px-4 py-2.5">{r.userEmail ?? 'system'}</td>
					<td class="px-4 py-2.5"><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">{r.action}</span></td>
					<td class="px-4 py-2.5"><span class="text-muted">{r.entity}</span> {r.summary ?? ''}</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="px-4 py-8 text-center text-muted">Nothing recorded yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
<Pager page={data.page} hasMore={data.hasMore} />
