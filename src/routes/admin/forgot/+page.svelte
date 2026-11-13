<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<div class="w-full max-w-sm">
	<h1 class="mb-2 text-center font-sans text-2xl font-semibold">Reset your password</h1>
	{#if !data.emailEnabled}
		<div class="card p-6 text-sm">
			<p>Email is not configured for this site, so password reset links cannot be sent.</p>
			<p class="mt-3">Ask a super admin to reset your password from <strong>Users</strong>, or run:</p>
			<pre class="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">npm run create-admin -- --email=you@example.com</pre>
		</div>
	{:else if form?.sent}
		<p class="card p-6 text-sm" role="status">
			If an account exists for that email, we have sent a link to reset the password. It expires in one hour.
		</p>
	{:else}
		<form method="POST" class="card space-y-4 p-6">
			{#if form?.message}<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{form.message}</p>{/if}
			<div>
				<label for="email" class="label">Email</label>
				<input id="email" name="email" type="email" required class="input" autocomplete="username" />
			</div>
			<button class="btn-primary w-full">Send reset link</button>
		</form>
	{/if}
	<p class="mt-6 text-center text-sm"><a href="/admin/login" class="text-muted hover:text-ink">← Back to sign in</a></p>
</div>
