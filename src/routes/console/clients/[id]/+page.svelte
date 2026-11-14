<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Tip from '#lib/console/Tip.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const c = $derived(data.client);
	const port = $derived(page.url.port ? `:${page.url.port}` : '');
	const siteUrl = (host: string, p = '/') => `${page.url.protocol}//${host}${port}${p}`;
	const primary = $derived(data.domains.find((d) => d.isPrimary) ?? null);
	const msg = (f: string) => (form && 'form' in form && form.form === f ? form : null);
	const when = (ms: number | null) =>
		ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
	const ROLE: Record<string, string> = {
		super_admin: 'Super admin',
		clinic_admin: 'Clinic admin',
		branch_staff: 'Bookings only'
	};
</script>

{#snippet notice(f: string)}
	{@const m = msg(f)}
	{#if m && 'message' in m && m.message}<p
			role="alert"
			class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
		>
			{m.message}
		</p>{/if}
	{#if m && 'ok' in m && m.ok}<p
			role="status"
			class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
		>
			{m.ok}
		</p>{/if}
{/snippet}

<a href="/console" class="text-sm text-muted hover:text-ink">← Clients</a>
<div class="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
	<div>
		<div class="flex items-center gap-1.5">
			<h1 class="font-sans text-2xl font-semibold">{c.name}</h1>
			<Tip key="client" small={false} />
		</div>
		<p class="text-sm text-muted">
			{c.slug} · {c.templateName} ·
			<span class={c.status === 'active' ? 'text-green-700' : 'text-gray-600'}
				>{c.status === 'active' ? 'Live' : 'Suspended'}</span
			>
		</p>
	</div>
	<div class="flex flex-wrap gap-2">
		{#if primary}<a
				href={siteUrl(primary.hostname)}
				target="_blank"
				rel="noopener"
				class="btn-outline">View website</a
			>{/if}
		<form
			method="POST"
			action="?/openAdmin"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success' && typeof result.data?.ssoUrl === 'string')
						window.location.assign(result.data.ssoUrl);
					else await update();
				}}
		>
			<button class="btn-primary">Open site admin</button>
		</form>
	</div>
</div>

{#if data.created}
	<p role="status" class="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
		Client created with its own database and the template’s sample content.
		{#if primary}The site is live at <a
				class="underline"
				href={siteUrl(primary.hostname)}
				target="_blank"
				rel="noopener">{primary.hostname}</a
			>.{/if}
	</p>
{/if}
{@render notice('open')}
{#if form && 'ssoUrl' in form && form.ssoUrl}
	<p class="mb-6 rounded-lg bg-white px-4 py-3 text-sm">
		<a class="link" href={form.ssoUrl}>Continue to the site admin →</a> (link valid for 60 seconds)
	</p>
{/if}
{#if data.dbError}<p role="alert" class="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
		{data.dbError}
	</p>{/if}

<div class="grid gap-6 lg:grid-cols-2">
	<!-- Web addresses -->
	<section class="space-y-4 card p-6 lg:col-span-2">
		<div class="flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Web addresses</h2>
			<Tip key="webAddresses" />
		</div>
		{@render notice('domains')}
		{#if data.domains.length}
			<ul class="divide-y divide-line rounded-lg border border-line">
				{#each data.domains as d (d.id)}
					<li class="flex flex-wrap items-center gap-3 px-4 py-3">
						<a
							href={siteUrl(d.hostname)}
							target="_blank"
							rel="noopener"
							class="font-mono text-sm hover:underline">{d.hostname}</a
						>
						{#if d.isPrimary}
							<span
								class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800"
								>Main address</span
							>
						{:else}
							<span class="text-xs text-muted">redirects to the main address</span>
						{/if}
						<div class="ml-auto flex gap-2">
							{#if !d.isPrimary}
								<form method="POST" action="?/primaryDomain" use:enhance>
									<input type="hidden" name="id" value={d.id} /><button class="btn-ghost btn-sm"
										>Make main</button
									>
								</form>
							{/if}
							<form method="POST" action="?/removeDomain" use:enhance>
								<input type="hidden" name="id" value={d.id} /><button
									class="btn-ghost btn-sm text-red-700">Remove</button
								>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
				No address yet — the site can’t be reached until you add one.
			</p>
		{/if}
		<form method="POST" action="?/addDomain" use:enhance class="flex flex-wrap items-end gap-3">
			<div class="min-w-64 flex-1">
				<label for="hostname" class="label">Add address</label>
				<input
					id="hostname"
					name="hostname"
					required
					class="input font-mono text-sm"
					placeholder="www.clinic.com"
				/>
			</div>
			<div class="flex items-center gap-1 pb-2">
				<label class="flex items-center gap-2 text-sm"
					><input type="checkbox" name="primary" /> Make main address</label
				>
				<Tip key="mainAddress" align="right" />
			</div>
			<button class="btn-outline">Add</button>
		</form>
		<p class="hint">
			Point the client’s domain at this server (DNS) — full instructions come with the deployment
			setup. Local testing: any
			<code>name.localhost</code> works without setup.
		</p>
	</section>

	<!-- Details -->
	<section class="card p-6">
		<div class="mb-4 flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Details</h2>
			<Tip key="details" />
		</div>
		<form
			method="POST"
			action="?/details"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-4"
		>
			{@render notice('details')}
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="name" class="text-sm font-medium text-ink">Clinic name</label>
					<Tip key="clinicName" />
				</div>
				<input id="name" name="name" required class="input" value={c.name} />
				<p class="hint">
					For the console. The name on the website is edited in the client’s admin.
				</p>
			</div>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="templateKey" class="text-sm font-medium text-ink">Template</label>
					<Tip key="templateEdit" />
				</div>
				<select id="templateKey" name="templateKey" class="input">
					{#each data.categories as cat (cat.key)}
						<optgroup label={cat.name}>
							{#each cat.templates as t (t.key)}<option
									value={t.key}
									selected={t.key === c.templateKey}>{t.name}</option
								>{/each}
						</optgroup>
					{/each}
				</select>
				<p class="hint">Changing the template keeps all of the client’s content.</p>
			</div>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="status" class="text-sm font-medium text-ink">Status</label>
					<Tip key="status" />
				</div>
				<select id="status" name="status" class="input">
					<option value="active" selected={c.status === 'active'}>Live</option>
					<option value="suspended" selected={c.status === 'suspended'}
						>Suspended — site shows “temporarily unavailable”</option
					>
				</select>
			</div>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="notes" class="text-sm font-medium text-ink">Notes</label>
					<Tip key="notes" />
				</div>
				<textarea id="notes" name="notes" rows="3" class="input">{c.notes ?? ''}</textarea>
			</div>
			<button class="btn-primary">Save</button>
		</form>
	</section>

	<!-- Logins -->
	<section class="space-y-4 card p-6">
		<div class="flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Client logins</h2>
			<Tip key="logins" />
		</div>
		<p class="text-sm text-muted">
			They sign in at {primary ? siteUrl(primary.hostname, '/admin') : 'their-address/admin'}.
		</p>
		{#if data.users.length}
			<ul class="divide-y divide-line text-sm">
				{#each data.users as u (u.id)}
					<li class="py-2">
						<span class="font-medium">{u.email}</span>
						<span class="text-muted">· {ROLE[u.role] ?? u.role}{u.active ? '' : ' · disabled'}</span
						>
						<span class="block text-xs text-muted">Last sign-in: {when(u.lastLoginAt)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted">No logins yet.</p>
		{/if}
		<form method="POST" action="?/saveUser" use:enhance class="space-y-3 border-t border-line pt-4">
			<p class="text-sm font-medium">Add a login or reset a password</p>
			{@render notice('users')}
			<div class="grid gap-3 sm:grid-cols-2">
				<input
					name="email"
					type="email"
					required
					class="input"
					placeholder="Email"
					aria-label="Email"
					autocomplete="off"
				/>
				<input name="name" class="input" placeholder="Name" aria-label="Name" autocomplete="off" />
				<input
					name="password"
					type="password"
					minlength="10"
					required
					class="input"
					placeholder="New password"
					aria-label="Password"
					autocomplete="new-password"
				/>
				<select name="role" class="input" aria-label="Role">
					<option value="clinic_admin">Clinic admin — site + bookings</option>
					<option value="branch_staff">Staff — bookings only</option>
				</select>
			</div>
			<button class="btn-outline">Save login</button>
		</form>
	</section>

	<!-- Activity -->
	<section class="card p-6">
		<div class="mb-3 flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Console activity</h2>
			<Tip key="activity" />
		</div>
		{#if data.log.length}
			<ul class="space-y-1 text-sm">
				{#each data.log as l (l.id)}
					<li>
						<span class="text-muted">{when(l.createdAt)}</span> — {l.summary ?? l.action}
						<span class="text-muted">({l.userEmail ?? 'system'})</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted">Nothing yet.</p>
		{/if}
	</section>

	<!-- Delete -->
	<section class="space-y-3 card border-red-200 p-6">
		<div class="flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold text-red-800">Delete client</h2>
			<Tip key="deleteClient" />
		</div>
		<p class="text-sm text-muted">
			Removes the client, its addresses and logins. On a server, its database and files are moved to <code
				>data/tenants/_deleted/</code
			> (not erased).
		</p>
		<form method="POST" action="?/delete" class="flex flex-wrap items-end gap-3">
			{@render notice('delete')}
			<div class="flex-1">
				<label for="confirm" class="label">Type <code>{c.slug}</code> to confirm</label>
				<input id="confirm" name="confirm" class="input" autocomplete="off" />
			</div>
			<button class="btn rounded-lg bg-red-700 px-4 py-2 text-white hover:bg-red-800">Delete</button
			>
		</form>
	</section>
</div>
