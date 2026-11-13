<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { toasts } from '#lib/admin/toast.svelte.js';
	import { ROLE_LABELS, type Role } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Editing = { id?: string; name: string; email: string; role: Role; active: boolean; locationIds: string[]; password: string };
	let editing = $state<Editing | null>(null);
	let open = $state(false);
	let errors = $state<Record<string, string>>({});
	let generated = $state<{ email: string; password: string } | null>(null);

	function edit(u?: (typeof data.users)[number]) {
		errors = {};
		editing = u
			? { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, locationIds: [...u.locationIds], password: '' }
			: { name: '', email: '', role: 'clinic_admin', active: true, locationIds: [], password: '' };
		open = true;
	}

	const roleHelp: Record<Role, string> = {
		super_admin: 'Everything, including settings, users and integrations.',
		clinic_admin: 'All website content and all appointments.',
		branch_staff: 'Appointments for their branches only. Can view content but not change it.'
	};
	const locName = (id: string) => data.locations.find((l) => l.id === id)?.name ?? '—';
</script>

<PageHeader title="Users" description="People who can sign in to this admin panel.">
	{#snippet actions()}
		<button class="btn-primary" onclick={() => edit()}><Icon name="plus" size={16} /> Add user</button>
	{/snippet}
</PageHeader>

{#if generated}
	<div class="card mb-6 border-accent bg-accent-100 p-4" role="status">
		<p class="font-semibold">Temporary password for {generated.email}</p>
		<p class="mt-1 font-mono text-lg select-all">{generated.password}</p>
		<p class="mt-1 text-sm">Share it securely. It will not be shown again; they can change it under "My account".</p>
		<button class="btn-ghost btn-sm mt-2" onclick={() => (generated = null)}>Dismiss</button>
	</div>
{/if}

<div class="card overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead class="border-b border-line bg-gray-50 text-xs text-muted uppercase">
			<tr><th class="px-4 py-3">Name</th><th class="px-4 py-3">Role</th><th class="px-4 py-3">Branches</th><th class="px-4 py-3">Last login</th><th class="px-4 py-3"><span class="sr-only">Actions</span></th></tr>
		</thead>
		<tbody class="divide-y divide-line">
			{#each data.users as u (u.id)}
				<tr class={u.active ? '' : 'opacity-60'}>
					<td class="px-4 py-3"><p class="font-medium">{u.name}</p><p class="text-muted">{u.email}</p></td>
					<td class="px-4 py-3">{ROLE_LABELS[u.role]}{u.active ? '' : ' (disabled)'}</td>
					<td class="px-4 py-3">{u.role === 'branch_staff' ? u.locationIds.map(locName).join(', ') : 'All'}</td>
					<td class="px-4 py-3 text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
					<td class="px-4 py-3 text-right"><button class="btn-outline btn-sm" onclick={() => edit(u)}>Edit</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<Modal bind:open title={editing?.id ? 'Edit user' : 'Add user'} size="md">
	{#if editing}
		<AdminForm
			payload={editing}
			bind:errors
			bare
			onsuccess={(d) => {
				open = false;
				if (d?.generatedPassword) generated = { email: String(d.email), password: String(d.generatedPassword) };
			}}
		>
			<div class="space-y-4">
				<TextField label="Name" bind:value={editing.name} required error={errors.name} />
				<TextField label="Email" type="email" bind:value={editing.email} required error={errors.email} />
				<SelectField label="Role" bind:value={editing.role} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} hint={roleHelp[editing.role]} />
				{#if editing.role === 'branch_staff'}
					<fieldset>
						<legend class="label">Branches</legend>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each data.locations as l (l.id)}
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" value={l.id} bind:group={editing.locationIds} class="rounded text-primary" />
									{l.name}
								</label>
							{/each}
						</div>
						{#if errors.locationIds}<p class="field-error">{errors.locationIds}</p>{/if}
					</fieldset>
				{/if}
				<TextField
					label={editing.id ? 'New password (optional)' : 'Password (optional)'}
					type="password"
					autocomplete="new-password"
					bind:value={editing.password}
					error={errors.password}
					hint={editing.id ? 'Leave blank to keep the current password.' : 'Leave blank to generate a temporary password.'}
				/>
				<Toggle label="Account active" bind:checked={editing.active} />
				<div class="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
					{#if editing.id}
						<button type="submit" form="del-user" class="btn-ghost text-red-700">Delete</button>
					{:else}<span></span>{/if}
					<button class="btn-primary">Save user</button>
				</div>
			</div>
		</AdminForm>
		{#if editing.id}
			<form
				id="del-user"
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this user? This cannot be undone.')) return cancel();
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toasts.push('User deleted');
							open = false;
						} else if (result.type === 'failure') toasts.push(String(result.data?.message), 'error');
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={editing.id} />
			</form>
		{/if}
	{/if}
</Modal>
