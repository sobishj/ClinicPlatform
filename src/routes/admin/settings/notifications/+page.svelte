<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import SecretField from '#lib/admin/SecretField.svelte';
	import { toasts } from '#lib/admin/toast.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let notifications = $state(structuredClone(data.values.notifications));
	// svelte-ignore state_referenced_locally
	let email = $state(structuredClone(data.values.email));
	let errors = $state<Record<string, string>>({});
</script>

<PageHeader title="Notifications & email" description="Who is told about new appointment requests, and how email is sent. Email is optional — the site works without it." />

<AdminForm payload={{ notifications, email }} bind:errors>
	<div class="space-y-6">
		<section class="card space-y-3 p-5">
			<h2 class="font-sans text-lg font-semibold">Appointment notifications</h2>
			<Toggle label="Email the branch" description="Sent to the branch's notification email (set on each location)." bind:checked={notifications.emailBranch} />
			<Toggle label="Email the patient" description="Only when the patient gave an email address." bind:checked={notifications.emailPatient} />
			<TextField label="Fallback email" type="email" bind:value={notifications.adminEmail} hint="Used when a branch has no notification email." error={errors['notifications.adminEmail']} />
			<TextField
				label="WhatsApp reply template"
				type="textarea"
				rows={3}
				bind:value={notifications.whatsappTemplate}
				hint="Pre-filled when staff tap WhatsApp on a request. Placeholders: {'{name} {clinic} {reference} {location} {date} {doctor}'}"
			/>
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Email provider</h2>
			{#if data.envManaged['email.provider']}
				<p class="rounded-lg bg-primary-50 px-3 py-2 text-sm">The provider is set by the EMAIL_PROVIDER environment variable.</p>
			{/if}
			<div class="grid gap-4 sm:grid-cols-3">
				<SelectField
					label="Provider"
					bind:value={email.provider}
					options={[
						{ value: 'none', label: 'None (no emails)' },
						{ value: 'resend', label: 'Resend (works everywhere)' },
						{ value: 'smtp', label: 'SMTP (dedicated server only)' }
					]}
				/>
				<TextField label="From address" bind:value={email.from} placeholder="Clinic Name <no-reply@yourdomain.com>" />
				<TextField label="Reply-to" type="email" bind:value={email.replyTo} />
			</div>
			{#if email.provider === 'resend'}
				<SecretField label="Resend API key" bind:value={email.resendApiKey} isSet={data.secrets['email.resendApiKey']} fromEnv={data.envManaged['email.resendApiKey']} />
			{:else if email.provider === 'smtp'}
				{#if data.target === 'cloudflare'}
					<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">SMTP is not available on Cloudflare Workers. Use Resend instead.</p>
				{/if}
				<div class="grid gap-4 sm:grid-cols-2">
					<TextField label="SMTP host" bind:value={email.smtpHost} />
					<TextField label="Port" type="number" bind:value={email.smtpPort} />
					<TextField label="Username" bind:value={email.smtpUser} autocomplete="off" />
					<SecretField label="Password" bind:value={email.smtpPass} isSet={data.secrets['email.smtpPass']} fromEnv={data.envManaged['email.smtpPass']} />
				</div>
				<Toggle label="Use TLS from the start (port 465)" bind:checked={email.smtpSecure} />
			{/if}
		</section>
	</div>
	{#snippet actions()}
		<button type="submit" formaction="?/test" class="btn-outline" form="test-email">Send test email</button>
	{/snippet}
</AdminForm>

<form
	id="test-email"
	method="POST"
	action="?/test"
	use:enhance={() =>
		async ({ result }) => {
			if (result.type === 'success') toasts.push(String(result.data?.message ?? 'Sent'));
			else if (result.type === 'failure') toasts.push(String(result.data?.message ?? 'Failed'), 'error', 6000);
		}}
></form>
