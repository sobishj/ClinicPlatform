<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Icon from '../Icon.svelte';
	import NavDropdown from './NavDropdown.svelte';
	import SocialLinks from './SocialLinks.svelte';
	import { telLink } from '#lib/format.js';
	import type { PublicSettings } from '#lib/server/settings.js';
	import type { NavData } from '#lib/server/queries.js';

	interface Props {
		site: PublicSettings;
		nav: NavData;
	}
	let { site, nav }: Props = $props();
	let mobileOpen = $state(false);
	let scrolled = $state(false);
	afterNavigate(() => (mobileOpen = false));

	const m = $derived(site.modules);
	const l = $derived(site.labels);
	const path = $derived(page.url.pathname);
	const is = (p: string) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/'));

	const servicesByCat = $derived.by(() => {
		const map = new Map<string, typeof nav.services>();
		for (const s of nav.services) {
			const c = s.category || l.services;
			if (!map.has(c)) map.set(c, []);
			map.get(c)!.push(s);
		}
		return [...map.entries()];
	});

	const links = $derived(
		[
			{ href: '/', label: 'Home', show: true },
			{ href: '/about', label: 'About', show: true },
			{ href: '/services', label: l.services, show: m.services, dropdown: 'services' as const },
			{ href: '/doctors', label: l.doctors, show: m.doctors },
			{ href: '/locations', label: l.locations, show: m.locations, dropdown: 'locations' as const },
			{ href: '/certifications', label: l.certifications, show: m.certifications },
			{ href: '/contact', label: 'Contact', show: true }
		].filter((x) => x.show)
	);
	const logo = $derived(site.clinic.logo);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 8)} />

<!-- Utility bar -->
<div class="hidden bg-secondary text-white/90 md:block">
	<div class="container-page flex h-10 items-center gap-5 text-sm">
		{#each site.clinic.phones.slice(0, 2) as p (p)}
			<a href={telLink(p)} class="inline-flex items-center gap-1.5 hover:text-white"><Icon name="phone" size={15} /> {p}</a>
		{/each}
		{#if site.clinic.email}
			<a href="mailto:{site.clinic.email}" class="inline-flex items-center gap-1.5 hover:text-white"><Icon name="mail" size={15} /> {site.clinic.email}</a>
		{/if}
		<div class="flex-1"></div>
		<SocialLinks social={site.clinic.social} size={18} />
	</div>
</div>

<header class="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur transition-shadow {scrolled ? 'border-line shadow-sm' : 'border-transparent'}">
	<div class="container-page flex h-16 items-center gap-4 lg:h-20">
		<a href="/" class="group flex min-w-0 items-center gap-2.5" aria-label="{site.clinic.name} — home">
			{#if logo?.url}
				<img src={logo.url} alt="" width={logo.width ?? 40} height={logo.height ?? 40} class="brand-logo transition-transform duration-300 group-hover:scale-105" />
			{/if}
			<span class="brand-name line-clamp-2 font-semibold text-ink">{site.clinic.shortName || site.clinic.name}</span>
		</a>

		<nav class="ml-auto hidden lg:block" aria-label="Main">
			<ul class="flex items-center gap-0.5">
				{#each links as link (link.href)}
					<li>
						{#if link.dropdown === 'services' && nav.services.length}
							<NavDropdown label={link.label} href={link.href} active={is(link.href)} wide={servicesByCat.length > 1}>
								<div class="grid gap-4 {servicesByCat.length > 1 ? 'sm:grid-cols-2' : ''}">
									{#each servicesByCat as [cat, items] (cat)}
										<div>
											<p class="mb-1 px-2 text-xs font-semibold tracking-wider text-muted uppercase">{cat}</p>
											<ul>
												{#each items as s (s.slug)}
													<li><a href="/services/{s.slug}" class="link-nudge block rounded-lg px-2 py-1.5 text-sm hover:bg-primary-50 hover:text-primary-800">{s.name}</a></li>
												{/each}
											</ul>
										</div>
									{/each}
								</div>
								<a href="/services" class="link-nudge mt-3 block rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100">All {l.services.toLowerCase()} →</a>
							</NavDropdown>
						{:else if link.dropdown === 'locations' && nav.locations.length}
							<NavDropdown label={link.label} href={link.href} active={is(link.href)}>
								<ul>
									{#each nav.locations as loc (loc.slug)}
										<li>
											<a href="/locations/{loc.slug}" class="link-nudge block rounded-lg px-2 py-2 hover:bg-primary-50">
												<span class="block text-sm font-medium">{loc.name}</span>
												<span class="block text-xs text-muted">{loc.type} · {loc.city}</span>
											</a>
										</li>
									{/each}
								</ul>
							</NavDropdown>
						{:else}
							<a href={link.href} class="nav-link block rounded-full px-3 py-2 text-[15px] font-medium hover:text-primary-700 {is(link.href) ? 'text-primary-700' : ''}" aria-current={is(link.href) ? 'page' : undefined}>{link.label}</a>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>

		{#if m.booking}
			<a href="/book" class="btn-primary ml-auto hidden sm:inline-flex lg:ml-3">
				<Icon name="calendar-check" size={18} />
				{l.bookCta}
			</a>
		{/if}
		<button
			type="button"
			class="btn-ghost ml-auto -mr-2 px-3 sm:ml-0 lg:hidden"
			aria-expanded={mobileOpen}
			aria-controls="mobile-nav"
			onclick={() => (mobileOpen = !mobileOpen)}
		>
			<Icon name={mobileOpen ? 'x' : 'menu'} size={24} />
			<span class="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
		</button>
	</div>

	<!-- Mobile menu -->
	<nav id="mobile-nav" class="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-surface lg:hidden {mobileOpen ? '' : 'hidden'}" aria-label="Main">
		<ul class="container-page divide-y divide-line py-2">
			{#each links as link (link.href)}
				<li>
					{#if link.dropdown === 'services' && nav.services.length}
						<details>
							<summary class="flex cursor-pointer items-center justify-between py-3 font-medium">{link.label} <Icon name="chevron-down" size={18} /></summary>
							<ul class="pb-3 pl-3">
								<li><a href="/services" class="block py-1.5 text-sm font-semibold text-primary-700">All {l.services.toLowerCase()}</a></li>
								{#each nav.services as s (s.slug)}<li><a href="/services/{s.slug}" class="block py-1.5 text-sm">{s.name}</a></li>{/each}
							</ul>
						</details>
					{:else if link.dropdown === 'locations' && nav.locations.length}
						<details>
							<summary class="flex cursor-pointer items-center justify-between py-3 font-medium">{link.label} <Icon name="chevron-down" size={18} /></summary>
							<ul class="pb-3 pl-3">
								<li><a href="/locations" class="block py-1.5 text-sm font-semibold text-primary-700">All {l.locations.toLowerCase()}</a></li>
								{#each nav.locations as loc (loc.slug)}<li><a href="/locations/{loc.slug}" class="block py-1.5 text-sm">{loc.name}</a></li>{/each}
							</ul>
						</details>
					{:else}
						<a href={link.href} class="block py-3 font-medium {is(link.href) ? 'text-primary-700' : ''}" aria-current={is(link.href) ? 'page' : undefined}>{link.label}</a>
					{/if}
				</li>
			{/each}
		</ul>
		<div class="container-page flex flex-wrap gap-3 pb-5">
			{#each site.clinic.phones.slice(0, 1) as p (p)}
				<a href={telLink(p)} class="btn-outline flex-1"><Icon name="phone" size={18} /> {p}</a>
			{/each}
			{#if m.booking}<a href="/book" class="btn-primary flex-1">{l.bookCta}</a>{/if}
		</div>
	</nav>
</header>
