<script lang="ts">
	import type { PageProps } from './$types';
	import Tip from '#lib/console/Tip.svelte';
	let { data, form }: PageProps = $props();
</script>

<div class="mx-auto w-full max-w-md py-16">
	<div class="mb-6 text-center">
		<div class="flex items-center justify-center gap-1.5">
			<h1 class="font-sans text-2xl font-semibold">Welcome</h1>
			<Tip key="setup" small={false} />
		</div>
		<p class="text-sm text-muted">Create the first console account. It can add and manage every client site.</p>
	</div>
	<form method="POST" class="card space-y-4 p-6 shadow-sm">
		{#if form?.message}<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{form.message}</p>{/if}
		<div>
			<label for="name" class="label">Your name</label>
			<input id="name" name="name" required class="input" autocomplete="name" value={String(form?.values?.name ?? '')} />
		</div>
		<div>
			<label for="email" class="label">Email</label>
			<input id="email" name="email" type="email" required class="input" autocomplete="username" value={String(form?.values?.email ?? '')} />
		</div>
		<div>
			<label for="password" class="label">Password</label>
			<input id="password" name="password" type="password" minlength="10" required class="input" autocomplete="new-password" aria-describedby="pw-hint" />
			<p id="pw-hint" class="hint">At least 10 characters. A passphrase is easiest to remember.</p>
		</div>
		{#if data.needsToken}
			<div>
				<div class="mb-1.5 flex items-center gap-1">
					<label for="token" class="text-sm font-medium text-ink">Setup token</label>
					<Tip key="setupToken" />
				</div>
				<input id="token" name="token" required class="input" aria-describedby="tok-hint" />
				<p id="tok-hint" class="hint">The one-time token you were given when the platform was deployed.</p>
			</div>
		{/if}
		<button class="btn-primary w-full">Create account</button>
	</form>
</div>
