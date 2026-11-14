<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const port = $derived(page.url.port ? `:${page.url.port}` : '');
	const siteUrl = (host: string) => `${page.url.protocol}//${host}${port}/`;
	const date = (ms: number) =>
		new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="font-sans text-2xl font-semibold">Clients</h1>
		<p class="text-sm text-muted">
			Every client has its own website, database, admin logins and bookings.
		</p>
	</div>
	<a href="/console/clients/new" class="btn-primary">Add client</a>
</div>

{#if data.slots}
	<p
		class="mb-4 rounded-lg px-3 py-2 text-sm {data.slots.used >= data.slots.total
			? 'bg-amber-50 text-amber-900'
			: 'bg-white text-muted'}"
	>
		Database slots in use: <strong>{data.slots.used} of {data.slots.total}</strong>.
		{#if data.slots.used >= data.slots.total}Add another <code>TENANT_*</code> D1 binding in wrangler.toml
			and redeploy before adding a client.{/if}
	</p>
{/if}

{#if !data.clients.length}
	<div class="card p-10 text-center">
		<p class="mb-4 text-muted">No clients yet.</p>
		<a href="/console/clients/new" class="btn-primary">Add your first client</a>
	</div>
{:else}
	<div class="overflow-x-auto card">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-line text-xs text-muted uppercase">
				<tr>
					<th class="px-4 py-3 font-semibold">Client</th>
					<th class="px-4 py-3 font-semibold">Website</th>
					<th class="px-4 py-3 font-semibold">Template</th>
					<th class="px-4 py-3 font-semibold">Status</th>
					<th class="px-4 py-3 font-semibold">Added</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.clients as c (c.id)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3">
							<a href="/console/clients/{c.id}" class="font-medium text-primary-700 hover:underline"
								>{c.name}</a
							>
							<div class="text-xs text-muted">{c.slug}</div>
						</td>
						<td class="px-4 py-3">
							{#if c.primary}
								<a href={siteUrl(c.primary)} target="_blank" rel="noopener" class="hover:underline"
									>{c.primary}</a
								>
								{#if c.domainCount > 1}<span class="text-xs text-muted">
										+{c.domainCount - 1} more</span
									>{/if}
							{:else}
								<span class="text-amber-700">No address yet</span>
							{/if}
						</td>
						<td class="px-4 py-3">{c.template}</td>
						<td class="px-4 py-3">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {c.status === 'active'
									? 'bg-green-100 text-green-800'
									: 'bg-gray-200 text-gray-700'}"
							>
								{c.status === 'active' ? 'Live' : 'Suspended'}
							</span>
						</td>
						<td class="px-4 py-3 text-muted">{date(c.createdAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
