<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		eyebrow?: string;
		intro?: string | null;
		crumbs?: Array<{ href: string; label: string }>;
		children?: Snippet;
	}
	let { title, eyebrow, intro, crumbs = [], children }: Props = $props();
</script>

<section class="bg-surface-2">
	<div class="container-page py-12 sm:py-16">
		{#if crumbs.length}
			<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted">
				<ol class="flex flex-wrap items-center gap-1.5">
					<li><a href="/" class="hover:text-ink">Home</a></li>
					{#each crumbs as c (c.href)}
						<li aria-hidden="true">/</li>
						<li><a href={c.href} class="hover:text-ink">{c.label}</a></li>
					{/each}
				</ol>
			</nav>
		{/if}
		{#if eyebrow}<p class="eyebrow mb-3">{eyebrow}</p>{/if}
		<h1 class="max-w-3xl text-4xl leading-tight sm:text-5xl">{title}</h1>
		{#if intro}<p class="lead mt-4 max-w-2xl">{intro}</p>{/if}
		{#if children}<div class="mt-6">{@render children()}</div>{/if}
	</div>
</section>
