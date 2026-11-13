<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import { callAction } from '#lib/admin/actions.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fmt = (ms: number | null) => (ms ? new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'short', timeStyle: 'medium' }).format(ms) : '—');
	let open = $state<string | null>(null);
</script>

<PageHeader title="Delivery log" description={data.hook.url} back={{ href: '/admin/integrations', label: 'Integrations' }} />

<div class="card overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead class="border-b border-line bg-gray-50 text-xs text-muted uppercase"><tr><th class="px-4 py-2.5">When</th><th class="px-4 py-2.5">Event</th><th class="px-4 py-2.5">Status</th><th class="px-4 py-2.5">Attempts</th><th class="px-4 py-2.5">Next try / error</th><th class="px-4 py-2.5"></th></tr></thead>
		<tbody class="divide-y divide-line">
			{#each data.deliveries as d (d.id)}
				<tr>
					<td class="px-4 py-2 whitespace-nowrap text-muted">{fmt(d.createdAt)}</td>
					<td class="px-4 py-2 font-mono text-xs">{d.event}</td>
					<td class="px-4 py-2"><span class="rounded-full px-2 py-0.5 text-xs font-semibold {d.status === 'success' ? 'bg-emerald-100 text-emerald-800' : d.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-accent-100 text-accent-700'}">{d.status}{d.responseStatus ? ` · ${d.responseStatus}` : ''}</span></td>
					<td class="px-4 py-2">{d.attempts}</td>
					<td class="max-w-sm px-4 py-2 text-xs text-muted">{d.status === 'pending' ? `Next: ${fmt(d.nextAttemptAt)}` : ''} {d.lastError ?? ''}</td>
					<td class="px-4 py-2 text-right whitespace-nowrap">
						<button class="btn-ghost btn-sm" onclick={() => (open = open === d.id ? null : d.id)}>Payload</button>
						{#if d.status !== 'success'}<button class="btn-outline btn-sm" onclick={() => callAction('?/retry', { id: d.id }, { success: 'Delivered' })}>Retry now</button>{/if}
					</td>
				</tr>
				{#if open === d.id}<tr><td colspan="6" class="bg-gray-50 px-4 py-3"><pre class="overflow-x-auto text-xs">{JSON.stringify(JSON.parse(d.payload), null, 2)}</pre></td></tr>{/if}
			{:else}
				<tr><td colspan="6" class="px-4 py-8 text-center text-muted">No deliveries yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
