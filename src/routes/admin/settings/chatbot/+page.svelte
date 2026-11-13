<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import SecretField from '#lib/admin/SecretField.svelte';
	import { parseEmbedCode } from '#lib/chatbot/embed.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let chatbot = $state(structuredClone(data.values.chatbot));
	// svelte-ignore state_referenced_locally
	let modules = $state(structuredClone(data.values.modules));
	let errors = $state<Record<string, string>>({});
	const tag = 'script';
	const embedExample = `<${tag} src="https://widget.example.com/loader.js" data-id="…" async></${tag}>`;
	const parsed = $derived(chatbot.provider === 'embed' ? parseEmbedCode(chatbot.embedCode) : null);
</script>

<PageHeader title="Chatbot" description="Optional chat assistant on the public website. Off by default." />

<AdminForm payload={{ chatbot, modules }} bind:errors>
	<div class="space-y-6">
		<section class="card space-y-4 p-5">
			<Toggle label="Show a chatbot on the website" bind:checked={modules.chatbot} />
			<fieldset class="grid gap-3 sm:grid-cols-3">
				<legend class="label">Type</legend>
				{#each [{ v: 'none', t: 'None', d: 'No chat button.' }, { v: 'embed', t: 'Third-party widget', d: 'Paste the script snippet from a chat provider.' }, { v: 'endpoint', t: 'Your own chatbot', d: 'A chatbot service you host (e.g. on Cloudflare).' }] as o (o.v)}
					<label class="card flex cursor-pointer gap-3 p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
						<input type="radio" value={o.v} bind:group={chatbot.provider} class="mt-1 text-primary" />
						<span><span class="block font-semibold">{o.t}</span><span class="text-sm text-muted">{o.d}</span></span>
					</label>
				{/each}
			</fieldset>
		</section>

		{#if chatbot.provider === 'embed'}
			<section class="card space-y-3 p-5">
				<TextField label="Widget code" type="textarea" rows={6} mono bind:value={chatbot.embedCode} error={errors['chatbot.embedCode']} placeholder={embedExample} />
				<p class="text-sm text-muted">Only &lt;script&gt; tags are used. External scripts must be https. They load after the page is idle and only on the public website, and their domains are added to the security policy automatically.</p>
				{#if parsed}
					<div class="rounded-lg bg-gray-50 p-3 text-sm">
						<p>Scripts found: <strong>{parsed.scripts.length}</strong>{parsed.origins.length ? ` · domains: ${parsed.origins.join(', ')}` : ''}</p>
						{#each parsed.errors as e (e)}<p class="text-red-700">{e}</p>{/each}
					</div>
				{/if}
			</section>
		{:else if chatbot.provider === 'endpoint'}
			<section class="card space-y-4 p-5">
				<TextField label="Chatbot endpoint URL" bind:value={chatbot.endpointUrl} error={errors['chatbot.endpointUrl']} placeholder="https://chat.example.workers.dev/message" />
				<SecretField label="Chatbot API key" bind:value={chatbot.apiKey} isSet={data.secrets['chatbot.apiKey']} hint="Sent by our server as Authorization: Bearer … — never exposed to visitors." />
				<div class="grid gap-4 sm:grid-cols-3">
					<TextField label="Window title" bind:value={chatbot.title} />
					<TextField label="Button label" bind:value={chatbot.buttonLabel} />
					<TextField label="Greeting" bind:value={chatbot.greeting} />
				</div>
				<details class="rounded-lg bg-gray-50 p-4 text-sm">
					<summary class="cursor-pointer font-semibold">How your chatbot connects</summary>
					<div class="mt-3 space-y-2">
						<p>The site POSTs <code>{'{ message, history, page, site }'}</code> to your endpoint and expects <code>{'{ reply: string, links?: [{ label, href }] }'}</code> within 20 seconds.</p>
						<p><code>site</code> includes the clinic name, the booking deep-link format and the API base <code>{data.apiBase}</code>. Create a <strong>read</strong>-scoped API key under Integrations so your chatbot can look up locations, hours, doctors, services and FAQs.</p>
						<p>Links like <code>/book?location=kakkanad&amp;doctor=…</code> open the booking form pre-filled.</p>
					</div>
				</details>
			</section>
		{/if}
	</div>
</AdminForm>
