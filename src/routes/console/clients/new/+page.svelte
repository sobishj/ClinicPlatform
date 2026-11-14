<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '#lib/slug.js';
	import Tip from '#lib/console/Tip.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const v = $derived((form?.values ?? {}) as Record<string, string>);
	let name = $state('');
	let slugEdited = $state(false);
	let slug = $state('');
	let submitting = $state(false);
	$effect(() => {
		if (!slugEdited) slug = slugify(name).slice(0, 60);
	});
	const err = (f: string) => (form?.field === f ? form.message : null);
</script>

<div class="mx-auto max-w-2xl">
	<a href="/console" class="text-sm text-muted hover:text-ink">← Clients</a>
	<div class="mt-2 mb-1 flex items-center gap-1.5">
		<h1 class="font-sans text-2xl font-semibold">Add client</h1>
		<Tip key="newClient" small={false} />
	</div>
	<p class="mb-6 text-sm text-muted">
		Creates the client’s own database, fills it with the template’s sample content (all editable in
		their admin), and connects their web addresses.
	</p>

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		{#if form?.message && !form.field}
			<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{form.message}</p>
		{/if}

		<section class="space-y-4 card p-6">
			<h2 class="font-sans text-lg font-semibold">Client</h2>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="name" class="text-sm font-medium text-ink">Clinic name</label>
					<Tip key="clinicNameNew" />
				</div>
				<input
					id="name"
					name="name"
					required
					class="input"
					bind:value={name}
					placeholder="Orchid Dental Care"
					aria-invalid={!!err('name')}
				/>
				{#if err('name')}<p class="field-error">{err('name')}</p>{/if}
			</div>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="slug" class="text-sm font-medium text-ink">Handle</label>
					<Tip key="handle" />
				</div>
				<input
					id="slug"
					name="slug"
					class="input"
					bind:value={slug}
					oninput={() => (slugEdited = true)}
					aria-describedby="slug-hint"
					aria-invalid={!!err('slug')}
				/>
				<p id="slug-hint" class="hint">
					Internal name used in the console and CLI only. Never shown on the website.
				</p>
				{#if err('slug')}<p class="field-error">{err('slug')}</p>{/if}
			</div>
		</section>

		<section class="space-y-4 card p-6">
			<div class="flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Template</h2>
			<Tip key="template" />
		</div>
			<fieldset class="space-y-3">
				<legend class="sr-only">Template</legend>
				{#each data.categories as cat (cat.key)}
					<p class="text-xs font-semibold tracking-wider text-muted uppercase">{cat.name}</p>
					{#each cat.templates as t (t.key)}
						<label
							class="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-checked:border-primary has-checked:bg-primary-50"
						>
							<input
								type="radio"
								name="templateKey"
								value={t.key}
								checked={(v.templateKey ?? data.defaultTemplate) === t.key}
								class="mt-1"
							/>
							<span>
								<span class="block font-medium">{t.name}</span>
								<span class="block text-sm text-muted">{t.description}</span>
							</span>
						</label>
					{/each}
				{/each}
			</fieldset>
			{#if err('templateKey')}<p class="field-error">{err('templateKey')}</p>{/if}
		</section>

		<section class="space-y-4 card p-6">
			<h2 class="font-sans text-lg font-semibold">Web addresses</h2>
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="domains" class="text-sm font-medium text-ink">Client URLs</label>
					<Tip key="clientUrls" />
				</div>
				<textarea
					id="domains"
					name="domains"
					rows="3"
					class="input font-mono text-sm"
					placeholder={'www.orchiddental.in\norchid.localhost'}
					aria-describedby="domains-hint"
					aria-invalid={!!err('domains')}>{v.domains ?? ''}</textarea
				>
				<p id="domains-hint" class="hint">
					One per line. The first is the main address; all others redirect to it. For local testing
					use names ending in <code>.localhost</code>
					(e.g. <code>orchid.localhost</code>) — they work without any setup. You can add or change
					addresses later.
				</p>
				{#if err('domains')}<p class="field-error">{err('domains')}</p>{/if}
			</div>
		</section>

		<section class="space-y-4 card p-6">
			<div class="flex items-center gap-1">
				<h2 class="font-sans text-lg font-semibold">
					Client admin login <span class="text-sm font-normal text-muted">(optional)</span>
				</h2>
				<Tip key="adminLogin" />
			</div>
			<p class="text-sm text-muted">
				The client signs in at <code>their-address/admin</code> to edit their site and see bookings.
			</p>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="adminName" class="label">Name</label>
					<input
						id="adminName"
						name="adminName"
						class="input"
						value={v.adminName ?? ''}
						autocomplete="off"
					/>
				</div>
				<div>
					<label for="adminEmail" class="label">Email</label>
					<input
						id="adminEmail"
						name="adminEmail"
						type="email"
						class="input"
						value={v.adminEmail ?? ''}
						autocomplete="off"
						aria-invalid={!!err('adminEmail')}
					/>
					{#if err('adminEmail')}<p class="field-error">{err('adminEmail')}</p>{/if}
				</div>
			</div>
			<div>
				<label for="adminPassword" class="label">Password</label>
				<input
					id="adminPassword"
					name="adminPassword"
					type="password"
					class="input"
					autocomplete="new-password"
					minlength="10"
					aria-invalid={!!err('adminPassword')}
				/>
				<p class="hint">
					At least 10 characters. Share it with the client securely; they can change it under
					Account.
				</p>
				{#if err('adminPassword')}<p class="field-error">{err('adminPassword')}</p>{/if}
			</div>
		</section>

		{#if data.slots}
			<section class="space-y-4 card p-6">
				<div class="flex items-center gap-1">
			<h2 class="font-sans text-lg font-semibold">Database slot</h2>
			<Tip key="slot" />
		</div>
				{#if data.slots.length}
					<div>
						<label for="slot" class="label">D1 binding</label>
						<select id="slot" name="slot" class="input">
							{#each data.slots as s (s)}<option value={s} selected={v.slot === s}>{s}</option
								>{/each}
						</select>
						<p class="hint">Each client uses one D1 database declared in wrangler.toml.</p>
					</div>
					<label class="flex items-center gap-2 text-sm"
						><input type="checkbox" name="wipeSlot" /> Wipe the slot if it still holds a deleted client’s
						data</label
					>
				{:else}
					<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
						No free database slot. Add a <code>TENANT_*</code> D1 binding in wrangler.toml and redeploy.
					</p>
				{/if}
				{#if err('slot')}<p class="field-error">{err('slot')}</p>{/if}
			</section>
		{/if}

		<div class="flex items-center gap-1">
			<label class="flex items-center gap-2 text-sm"
				><input type="checkbox" name="demoAppointments" /> Add a few demo appointment requests (for showing
				the bookings screen)</label
			>
			<Tip key="demoAppointments" />
		</div>

		<div class="flex gap-3">
			<button class="btn-primary" disabled={submitting}
				>{submitting ? 'Creating…' : 'Create client'}</button
			>
			<a href="/console" class="btn-ghost">Cancel</a>
		</div>
	</form>
</div>
