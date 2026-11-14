<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let submitting = $state(false);
</script>

<div class="mx-auto w-full max-w-sm py-16">
	<div class="mb-6 text-center">
		<h1 class="font-sans text-2xl font-semibold">Console</h1>
		<p class="text-sm text-muted">Sign in to manage client sites</p>
	</div>
	<form
		method="POST"
		class="space-y-4 card p-6 shadow-sm"
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
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="username"
				required
				class="input"
				value={form?.email ?? ''}
			/>
		</div>
		<div>
			<label for="password" class="label">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="input"
			/>
		</div>
		<button class="btn-primary w-full" disabled={submitting}
			>{submitting ? 'Signing in…' : 'Sign in'}</button
		>
	</form>
</div>
