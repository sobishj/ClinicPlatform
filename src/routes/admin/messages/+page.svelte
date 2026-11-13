<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { callAction } from '#lib/admin/actions.js';
	import { telLink, whatsappLink } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fmt = (ms: number) => new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.site.clinic.timeZone }).format(ms);
	const setStatus = (id: string, status: string) => callAction('?/status', { id, status }, { success: status === 'archived' ? 'Archived' : 'Updated' });
</script>

<PageHeader title="Messages" description="Messages sent through the contact form.">
	{#snippet actions()}
		<a href={data.archived ? '?' : '?archived=1'} class="btn-outline btn-sm">{data.archived ? 'Show inbox' : 'Show archived'}</a>
	{/snippet}
</PageHeader>

<ul class="space-y-3">
	{#each data.rows as { m, locationName } (m.id)}
		<li class="card p-4 {m.status === 'new' ? 'border-l-4 border-l-accent' : ''}">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p class="font-semibold">{m.name} {#if m.status === 'new'}<span class="ml-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-700">New</span>{/if}</p>
					<p class="text-xs text-muted">{fmt(m.createdAt)}{locationName ? ` · ${locationName}` : ''}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					{#if m.phone}
						<a href={telLink(m.phone)} class="btn-outline btn-sm"><Icon name="phone" size={16} /> {m.phone}</a>
						<a href={whatsappLink(m.phone)} target="_blank" rel="noopener" class="btn-outline btn-sm" aria-label="WhatsApp {m.name}"><Icon name="whatsapp" size={16} /></a>
					{/if}
					{#if m.email}<a href="mailto:{m.email}" class="btn-outline btn-sm"><Icon name="mail" size={16} /> Reply</a>{/if}
				</div>
			</div>
			<p class="mt-3 text-sm whitespace-pre-wrap">{m.body}</p>
			<div class="mt-3 flex gap-3 text-sm">
				{#if m.status === 'new'}<button class="text-primary-700 hover:underline" onclick={() => setStatus(m.id, 'read')}>Mark as read</button>{/if}
				{#if m.status !== 'archived'}<button class="text-muted hover:underline" onclick={() => setStatus(m.id, 'archived')}>Archive</button>
				{:else}<button class="text-muted hover:underline" onclick={() => setStatus(m.id, 'read')}>Move to inbox</button>{/if}
			</div>
		</li>
	{:else}
		<li class="card p-10 text-center text-muted">No messages.</li>
	{/each}
</ul>
