<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import SecretField from '#lib/admin/SecretField.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import type { PageProps } from './$types';
	import type { ImageRef } from '#lib/types.js';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let seo = $state(structuredClone(data.values.seo));
	// svelte-ignore state_referenced_locally
	let analytics = $state(structuredClone(data.values.analytics));
	// svelte-ignore state_referenced_locally
	let security = $state(structuredClone(data.values.security));
	let errors = $state<Record<string, string>>({});

	let og = $state<ImageRef | null>(seo.ogImage ? { url: seo.ogImage, alt: 'Social sharing image' } : null);
	$effect(() => {
		seo.ogImage = og?.url ?? '';
	});
</script>

<PageHeader title="SEO, analytics & spam protection" description="Defaults for search engines and social sharing, Google Analytics, and Cloudflare Turnstile." />

<AdminForm payload={{ seo, analytics, security }} bind:errors>
	<div class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Search & sharing defaults</h2>
			<TextField label="Title template" bind:value={seo.titleTemplate} hint={'%s is the page title, {clinic} the clinic name. e.g. "%s | {clinic}"'} />
			<TextField label="Homepage title" bind:value={seo.defaultTitle} hint="Leave blank to use the clinic name and tagline." />
			<TextField label="Default description" type="textarea" rows={3} bind:value={seo.defaultDescription} maxlength={300} hint="About 150 characters. Used when a page has no description of its own." />
			<ImageField label="Default social sharing image" bind:value={og} maxWidth={1200} hint="1200×630 works best for WhatsApp, Facebook and LinkedIn previews." />
			<Toggle label="Allow search engines to index the site" description="Turn off while building a staging site." bind:checked={seo.allowIndexing} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Google Analytics 4</h2>
			<TextField label="Measurement ID" bind:value={analytics.ga4Id} placeholder="G-XXXXXXXXXX" error={errors['analytics.ga4Id']} hint="Optional. Leave empty for no analytics." />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Cloudflare Turnstile (spam protection)</h2>
			<p class="text-sm text-muted">
				Free on any hosting. Create a widget at dash.cloudflare.com → Turnstile and paste the keys here. Without keys, forms still work but rely on rate limits only.
			</p>
			<div class="grid gap-4 sm:grid-cols-2">
				{#if data.envManaged['security.turnstileSiteKey']}
					<p class="rounded-lg bg-primary-50 px-3 py-2 text-sm">Site key is set by an environment variable.</p>
				{:else}
					<TextField label="Site key" bind:value={security.turnstileSiteKey} mono />
				{/if}
				<SecretField label="Secret key" bind:value={security.turnstileSecretKey} isSet={data.secrets['security.turnstileSecretKey']} fromEnv={data.envManaged['security.turnstileSecretKey']} />
			</div>
		</section>
	</div>
</AdminForm>
