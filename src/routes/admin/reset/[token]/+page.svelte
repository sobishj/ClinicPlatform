<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<div class="w-full max-w-sm">
	<h1 class="mb-4 text-center font-sans text-2xl font-semibold">Choose a new password</h1>
	{#if !data.valid}
		<p class="card p-6 text-sm">This reset link is invalid or has expired. <a class="link" href="/admin/forgot">Request a new one</a>.</p>
	{:else}
		<form method="POST" class="card space-y-4 p-6">
			{#if form?.message}<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{form.message}</p>{/if}
			<div>
				<label for="password" class="label">New password</label>
				<input id="password" name="password" type="password" minlength="10" required class="input" autocomplete="new-password" />
			</div>
			<div>
				<label for="confirm" class="label">Confirm password</label>
				<input id="confirm" name="confirm" type="password" minlength="10" required class="input" autocomplete="new-password" />
			</div>
			<button class="btn-primary w-full">Save password</button>
		</form>
	{/if}
</div>
