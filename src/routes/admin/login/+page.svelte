<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<div class="w-full max-w-sm">
	<div class="mb-6 text-center">
		{#if data.site.clinic.logo?.url}
			<img src={data.site.clinic.logo.url} alt="" class="mx-auto mb-3 size-12 rounded-xl object-contain" />
		{/if}
		<h1 class="font-sans text-2xl font-semibold">{data.site.clinic.name}</h1>
		<p class="text-sm text-muted">Sign in to the admin panel</p>
	</div>
	<form
		method="POST"
		class="card space-y-4 p-6 shadow-sm"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		{#if form?.message}
			<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{form.message}</p>
		{/if}
		<div>
			<label for="email" class="label">Email</label>
			<input id="email" name="email" type="email" autocomplete="username" required class="input" value={form?.email ?? ''} />
		</div>
		<div>
			<div class="flex items-baseline justify-between">
				<label for="password" class="label">Password</label>
				<a href="/admin/forgot" class="text-sm text-primary-700 hover:underline">Forgot?</a>
			</div>
			<input id="password" name="password" type="password" autocomplete="current-password" required class="input" />
		</div>
		<button class="btn-primary w-full" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
	</form>
	<p class="mt-6 text-center text-sm"><a href="/" class="text-muted hover:text-ink">← Back to website</a></p>
</div>
