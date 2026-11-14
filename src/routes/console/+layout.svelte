<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>{page.data.title ? `${page.data.title} · ` : ''}Console</title>
</svelte:head>

<div class="min-h-dvh bg-gray-50" style="--brand-card:#ffffff">
	{#if data.consoleUser}
		<header class="border-b border-line bg-white">
			<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
				<a href="/console" class="font-semibold">Console</a>
				<nav class="flex gap-4 text-sm">
					<a
						href="/console"
						class="hover:text-primary-700"
						aria-current={page.url.pathname === '/console' ? 'page' : undefined}>Clients</a
					>
					<a
						href="/console/clients/new"
						class="hover:text-primary-700"
						aria-current={page.url.pathname === '/console/clients/new' ? 'page' : undefined}
						>Add client</a
					>
				</nav>
				<div class="ml-auto flex items-center gap-3 text-sm">
					<span class="text-muted">{data.consoleUser.email}</span>
					<form method="POST" action="/console/logout">
						<button class="btn-ghost btn-sm">Sign out</button>
					</form>
				</div>
			</div>
		</header>
	{/if}
	<main class="mx-auto max-w-6xl px-4 py-8">
		{@render children()}
	</main>
</div>
