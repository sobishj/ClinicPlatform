<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import SecretField from '#lib/admin/SecretField.svelte';
	import CheckboxList from '#lib/admin/CheckboxList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '#lib/admin/toast.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fmt = (ms: number | null) => (ms ? new Intl.DateTimeFormat(data.site.clinic.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(ms) : 'Never');

	// ── API keys ──
	let keyOpen = $state(false);
	let keyForm = $state({ name: '', scopes: ['read'] as string[] });
	let keyErrors = $state<Record<string, string>>({});
	let shownSecret = $state<{ title: string; value: string; hint: string } | null>(null);

	// ── webhooks ──
	let hookOpen = $state(false);
	let hookForm = $state<{ id?: string; name: string; url: string; events: string[]; active: boolean }>({ name: '', url: '', events: [], active: true });
	let hookErrors = $state<Record<string, string>>({});
	function editHook(h?: (typeof data.hooks)[number]) {
		hookErrors = {};
		hookForm = h ? { id: h.id, name: h.name, url: h.url, events: [...h.events], active: h.active } : { name: '', url: 'https://', events: ['appointment.created'], active: true };
		hookOpen = true;
	}

	// ── provider & channels ──
	// svelte-ignore state_referenced_locally
	let integ = $state(structuredClone(data.integrations));
	let integErrors = $state<Record<string, string>>({});
	const provider = $derived(data.providers.find((p) => p.id === integ.provider) ?? data.providers[0]);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toasts.push('Copied');
		} catch {
			toasts.push('Copy failed — select and copy manually', 'error');
		}
	}
	async function action(name: string, id: string, success: string) {
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch(`?/${name}`, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'success') {
			const d = result.data as { newSecret?: string; message?: string } | undefined;
			if (d?.newSecret) shownSecret = { title: 'New signing secret', value: d.newSecret, hint: 'Update your receiver with this secret now — it will not be shown again.' };
			toasts.push(d?.message ?? success);
			await invalidateAll();
		} else if (result.type === 'failure') toasts.push(String((result.data as { message?: string })?.message ?? 'Failed'), 'error', 7000);
	}
</script>

<PageHeader title="Integrations & API" description="Connect the website to other software: API keys for your systems or chatbot, webhooks that notify them of changes, and optional adapters and messaging channels.">
	{#snippet actions()}
		<a href="/api/v1/openapi.json" target="_blank" rel="noopener" class="btn-outline"><Icon name="book-open" size={16} /> API documentation (OpenAPI)</a>
	{/snippet}
</PageHeader>

{#if shownSecret}
	<div class="card mb-6 border-accent bg-accent-100 p-4" role="alert">
		<p class="font-semibold">{shownSecret.title}</p>
		<div class="mt-2 flex flex-wrap items-center gap-2">
			<code class="rounded bg-white px-2 py-1 font-mono text-sm break-all select-all">{shownSecret.value}</code>
			<button class="btn-outline btn-sm" onclick={() => copy(shownSecret!.value)}><Icon name="copy" size={14} /> Copy</button>
		</div>
		<p class="mt-2 text-sm">{shownSecret.hint}</p>
		<button class="btn-ghost btn-sm mt-1" onclick={() => (shownSecret = null)}>I have saved it</button>
	</div>
{/if}

<div class="space-y-8">
	<!-- API keys -->
	<section>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="font-sans text-lg font-semibold">API keys</h2>
			<button class="btn-primary btn-sm" onclick={() => ((keyForm = { name: '', scopes: ['read'] }), (keyErrors = {}), (keyOpen = true))}><Icon name="plus" size={16} /> New key</button>
		</div>
		<p class="mb-3 text-sm text-muted">Base URL: <code class="rounded bg-gray-100 px-1.5">{data.apiBase}</code>. Send keys as <code class="rounded bg-gray-100 px-1.5">Authorization: Bearer …</code>. Keys are stored hashed and shown only once.</p>
		<div class="card overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-line bg-gray-50 text-xs text-muted uppercase"><tr><th class="px-4 py-2.5">Name</th><th class="px-4 py-2.5">Key</th><th class="px-4 py-2.5">Scopes</th><th class="px-4 py-2.5">Last used</th><th class="px-4 py-2.5"><span class="sr-only">Actions</span></th></tr></thead>
				<tbody class="divide-y divide-line">
					{#each data.keys as k (k.id)}
						<tr class={k.revokedAt ? 'opacity-50' : ''}>
							<td class="px-4 py-2.5 font-medium">{k.name}</td>
							<td class="px-4 py-2.5 font-mono text-xs">{k.prefix}…</td>
							<td class="px-4 py-2.5 text-xs">{k.scopes.join(', ')}</td>
							<td class="px-4 py-2.5 text-muted">{k.revokedAt ? `Revoked ${fmt(k.revokedAt)}` : fmt(k.lastUsedAt)}</td>
							<td class="px-4 py-2.5 text-right">{#if !k.revokedAt}<button class="btn-ghost btn-sm text-red-700" onclick={() => confirm(`Revoke “${k.name}”? Systems using it will stop working.`) && action('revokeKey', k.id, 'Key revoked')}>Revoke</button>{/if}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-4 py-6 text-center text-muted">No API keys yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Webhooks -->
	<section>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="font-sans text-lg font-semibold">Webhooks</h2>
			<button class="btn-primary btn-sm" onclick={() => editHook()}><Icon name="plus" size={16} /> New webhook</button>
		</div>
		<p class="mb-3 text-sm text-muted">We POST JSON to your URL when things change, signed with HMAC-SHA256 (<code>X-Webhook-Signature</code>). Failed deliveries are retried for about 15 hours.</p>
		<ul class="space-y-2">
			{#each data.hooks as h (h.id)}
				<li class="card flex flex-wrap items-center gap-3 p-4 {h.active ? '' : 'opacity-60'}">
					<div class="min-w-0 flex-1">
						<p class="font-medium">{h.name} {#if !h.active}<span class="text-xs text-muted">(paused)</span>{/if}</p>
						<p class="truncate font-mono text-xs text-muted">{h.url}</p>
						<p class="text-xs text-muted">{h.events.join(', ')} · delivered {h.stats.success ?? 0} · pending {h.stats.pending ?? 0} · failed {h.stats.failed ?? 0}</p>
					</div>
					<div class="flex flex-wrap gap-1">
						<button class="btn-outline btn-sm" onclick={() => action('testHook', h.id, 'Test sent')}>Send test</button>
						<a class="btn-ghost btn-sm" href="/admin/integrations/webhooks/{h.id}">Log</a>
						<button class="btn-ghost btn-sm" onclick={() => editHook(h)}>Edit</button>
						<button class="btn-ghost btn-sm" onclick={() => confirm('Generate a new signing secret?') && action('rotateSecret', h.id, 'Secret rotated')}>New secret</button>
						<button class="btn-ghost btn-sm text-red-700" onclick={() => confirm('Delete this webhook?') && action('deleteHook', h.id, 'Deleted')}>Delete</button>
					</div>
				</li>
			{:else}
				<li class="card p-6 text-center text-sm text-muted">No webhooks yet.</li>
			{/each}
		</ul>
	</section>

	<!-- Provider + channels -->
	<AdminForm action="?/saveIntegrations" payload={integ} bind:errors={integErrors} submitLabel="Save integration settings">
		<div class="space-y-6">
			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Practice software</h2>
				<SelectField label="Integration adapter" bind:value={integ.provider} options={data.providers.map((p) => ({ value: p.id, label: p.label }))} hint={provider.description} />
				{#each provider.fields as f (f.key)}
					{#if f.secret}
						<SecretField label={f.label} bind:value={integ.providerConfig[f.key]} isSet={integ.provider === data.integrations.provider && data.integrations.providerSecretsSet[f.key]} />
					{:else}
						<TextField label={f.label} bind:value={integ.providerConfig[f.key]} placeholder={f.placeholder} />
					{/if}
				{/each}
				{#if integErrors.providerConfig}<p class="field-error">{integErrors.providerConfig}</p>{/if}
				{#if integ.provider !== 'none'}
					<Toggle label="Use the external system's availability for live time slots" description="If it does not answer, local schedules are used." bind:checked={integ.useProviderAvailability} />
				{/if}
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">WhatsApp Business (Cloud API)</h2>
				<p class="text-sm text-muted">Optional. Sends patients an approved template message when they request an appointment or its status changes. Staff can always reply with the one-tap WhatsApp button instead.</p>
				<Toggle label="Enable WhatsApp messages" bind:checked={integ.whatsappCloud.enabled} />
				{#if integ.whatsappCloud.enabled}
					<div class="grid gap-4 sm:grid-cols-2">
						<TextField label="Phone number ID" bind:value={integ.whatsappCloud.phoneNumberId} mono />
						<SecretField label="Access token" bind:value={integ.whatsappCloud.accessToken} isSet={data.integrations.whatsappTokenSet} />
						<TextField label="Template name" bind:value={integ.whatsappCloud.templateName} hint="Body variables: {'{{1}}'} name, {'{{2}}'} reference, {'{{3}}'} branch, {'{{4}}'} date/time" />
						<TextField label="Template language" bind:value={integ.whatsappCloud.templateLanguage} placeholder="en" />
					</div>
				{/if}
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">SMS</h2>
				<Toggle label="Enable SMS" bind:checked={integ.sms.enabled} />
				{#if integ.sms.enabled}
					<SelectField label="Gateway" bind:value={integ.sms.provider} options={[{ value: 'none', label: 'None' }, { value: 'webhook', label: 'Any gateway via JSON webhook ({ to, text })' }]} />
					{#if integ.sms.provider === 'webhook'}
						<div class="grid gap-4 sm:grid-cols-2">
							<TextField label="Webhook URL" bind:value={integ.sms.webhookUrl} error={integErrors['sms.webhookUrl']} />
							<SecretField label="Bearer token" bind:value={integ.sms.authToken} isSet={data.integrations.smsTokenSet} />
						</div>
					{/if}
				{/if}
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Browser access (CORS)</h2>
				<TextField label="Allowed origins" bind:value={integ.corsOrigins} placeholder="https://chat.example.com, https://app.example.com" hint="Websites allowed to call the API directly from a browser. Leave empty for server-to-server use only." />
			</section>
		</div>
	</AdminForm>
</div>

<Modal bind:open={keyOpen} title="New API key" size="md">
	<AdminForm
		action="?/createKey"
		payload={keyForm}
		bind:errors={keyErrors}
		bare
		successMessage="Key created"
		onsuccess={(d) => {
			keyOpen = false;
			if (d?.newKey) shownSecret = { title: `API key “${keyForm.name}”`, value: String(d.newKey), hint: 'Copy it now — it is stored hashed and cannot be shown again.' };
		}}
	>
		<div class="space-y-4">
			<TextField label="Name" bind:value={keyForm.name} required error={keyErrors.name} placeholder="e.g. Website chatbot" />
			<CheckboxList label="Scopes" bind:selected={keyForm.scopes} options={Object.entries(data.scopes).map(([value, label]) => ({ value, label: value, hint: label }))} columns={1} error={keyErrors.scopes} />
			<div class="flex justify-end border-t border-line pt-4"><button class="btn-primary">Create key</button></div>
		</div>
	</AdminForm>
</Modal>

<Modal bind:open={hookOpen} title={hookForm.id ? 'Edit webhook' : 'New webhook'} size="md">
	<AdminForm
		action="?/saveHook"
		payload={hookForm}
		bind:errors={hookErrors}
		bare
		onsuccess={(d) => {
			hookOpen = false;
			if (d?.newSecret) shownSecret = { title: 'Webhook signing secret', value: String(d.newSecret), hint: 'Use it to verify X-Webhook-Signature. It will not be shown again.' };
		}}
	>
		<div class="space-y-4">
			<TextField label="Name" bind:value={hookForm.name} required error={hookErrors.name} />
			<TextField label="URL" bind:value={hookForm.url} required error={hookErrors.url} mono />
			<CheckboxList label="Events" bind:selected={hookForm.events} options={data.events.map((e) => ({ value: e, label: e }))} columns={1} error={hookErrors.events} />
			<Toggle label="Active" bind:checked={hookForm.active} />
			<div class="flex justify-end border-t border-line pt-4"><button class="btn-primary">Save webhook</button></div>
		</div>
	</AdminForm>
</Modal>
