<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let form = $state({ name: data.me.name, currentPassword: '', newPassword: '' });
	let errors = $state<Record<string, string>>({});
</script>

<PageHeader title="My account" description={data.me.email} />

<div class="max-w-xl">
	<AdminForm payload={form} bind:errors onsuccess={() => ((form.currentPassword = ''), (form.newPassword = ''))}>
		<div class="card space-y-4 p-5">
			<TextField label="Name" bind:value={form.name} error={errors.name} />
			<h2 class="pt-2 font-sans font-semibold">Change password</h2>
			<TextField label="Current password" type="password" autocomplete="current-password" bind:value={form.currentPassword} error={errors.currentPassword} />
			<TextField label="New password" type="password" autocomplete="new-password" bind:value={form.newPassword} error={errors.newPassword} hint="At least 10 characters. Other devices will be signed out." />
		</div>
	</AdminForm>
</div>
