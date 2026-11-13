<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';

	const notFound = $derived(page.status === 404);
	const site = $derived(page.data.site);
</script>

<svelte:head>
	<title>{notFound ? 'Page not found' : 'Something went wrong'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
	<p class="eyebrow mb-3">{page.status}</p>
	<h1 class="text-4xl sm:text-5xl">{notFound ? "We can't find that page" : 'Something went wrong'}</h1>
	<p class="lead mt-4 max-w-lg">
		{notFound ? 'It may have moved, or the link may be out of date. These might help:' : (page.error?.message ?? 'Please try again in a moment.')}
	</p>
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<a href="/" class="btn-primary"><Icon name="house" size={18} /> Home</a>
		{#if site?.modules?.services}<a href="/services" class="btn-outline">{site.labels.services}</a>{/if}
		{#if site?.modules?.locations}<a href="/locations" class="btn-outline">{site.labels.locations}</a>{/if}
		<a href="/contact" class="btn-outline">Contact</a>
	</div>
</section>
