<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import { ADMIN_NAV } from '#lib/admin/nav.js';
	import { can } from '#lib/permissions.js';
	import { toasts } from '#lib/admin/toast.svelte.js';
	import { ROLE_LABELS } from '#lib/types.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	const site = $derived(data.site);
	const nav = $derived(
		ADMIN_NAV.map((g) => ({
			...g,
			items: g.items.filter((i) => can(data.user, i.permission))
		})).filter((g) => g.items.length)
	);
	const isActive = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>{page.data.title ? `${page.data.title} · ` : ''}Admin · {site.clinic.name}</title>
</svelte:head>

<a href="#admin-main" class="skip-link">Skip to content</a>

{#if !data.user}
	<main id="admin-main" class="flex min-h-dvh items-center justify-center bg-surface-2 px-4 py-10" style="--brand-card:#ffffff">
		{@render children()}
	</main>
{:else}
	<div class="min-h-dvh bg-gray-50 lg:flex" style="--brand-card:#ffffff">
		<!-- Sidebar -->
		<aside
			class="fixed inset-y-0 left-0 z-40 w-72 -translate-x-full overflow-y-auto border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 {menuOpen
				? 'translate-x-0'
				: ''}"
			aria-label="Admin navigation"
		>
			<div class="flex items-center gap-3 border-b border-line px-5 py-4">
				{#if site.clinic.logo?.url}
					<img src={site.clinic.logo.url} alt="" class="size-9 rounded-lg object-contain" />
				{/if}
				<div class="min-w-0">
					<p class="truncate font-semibold">{site.clinic.shortName || site.clinic.name}</p>
					<p class="text-xs text-muted">Admin panel</p>
				</div>
			</div>
			<nav class="px-3 py-4">
				{#each nav as group (group.label)}
					{#if group.label}
						<p class="mt-5 mb-1 px-3 text-xs font-semibold tracking-wider text-muted uppercase">{group.label}</p>
					{/if}
					<ul class="space-y-0.5">
						{#each group.items as item (item.href)}
							<li>
								<a
									href={item.href}
									aria-current={isActive(item.href) ? 'page' : undefined}
									class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium {isActive(item.href)
										? 'bg-primary-50 text-primary-800'
										: 'text-ink hover:bg-gray-100'}"
								>
									<Icon name={item.icon} size={18} />
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				{/each}
			</nav>
		</aside>
		{#if menuOpen}
			<button
				type="button"
				class="fixed inset-0 z-30 bg-black/40 lg:hidden"
				aria-label="Close menu"
				onclick={() => (menuOpen = false)}
			></button>
		{/if}

		<div class="min-w-0 flex-1">
			<header class="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
				<button
					type="button"
					class="btn-ghost btn-sm lg:hidden"
					aria-label="Open menu"
					aria-expanded={menuOpen}
					onclick={() => (menuOpen = true)}
				>
					<Icon name="menu" />
				</button>
				<div class="flex-1"></div>
				<a href="/" target="_blank" rel="noopener" class="btn-outline btn-sm">
					<Icon name="external-link" size={16} /> <span class="hidden sm:inline">View website</span>
				</a>
				<div class="hidden text-right text-sm sm:block">
					<p class="font-medium">{data.user.name}</p>
					<p class="text-xs text-muted">{ROLE_LABELS[data.user.role]}</p>
				</div>
				<a href="/admin/account" class="btn-ghost btn-sm" aria-label="My account"><Icon name="user" /></a>
				<form method="POST" action="/admin/logout">
					<button class="btn-ghost btn-sm" aria-label="Log out"><Icon name="log-out" /></button>
				</form>
			</header>
			<main id="admin-main" class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<div class="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2" aria-live="polite" role="status">
	{#each toasts.items as t (t.id)}
		<div
			class="pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg {t.tone === 'error'
				? 'bg-red-700 text-white'
				: t.tone === 'info'
					? 'bg-ink text-white'
					: 'bg-primary text-white'}"
		>
			{t.message}
		</div>
	{/each}
</div>
