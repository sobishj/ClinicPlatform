<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Admin</title></svelte:head>

<div class="card mx-auto max-w-lg p-8 text-center">
	<p class="eyebrow mb-2">{page.status}</p>
	<h1 class="font-sans text-2xl font-semibold">
		{page.status === 403 ? 'You do not have access to this' : page.status === 404 ? 'Not found' : 'Something went wrong'}
	</h1>
	<p class="mt-2 text-muted">{page.error?.message}</p>
	<a href="/admin" class="btn-primary mt-6">Back to dashboard</a>
</div>
