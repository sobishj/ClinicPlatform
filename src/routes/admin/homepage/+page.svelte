<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import SortableList from '#lib/admin/SortableList.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import { SECTION_MODULE, type HomepageSectionId, type HomepageSection } from '#lib/settings/schema.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let homepage = $state(structuredClone(data.values.homepage));
	// svelte-ignore state_referenced_locally
	let banner = $state(structuredClone(data.values.banner));
	// svelte-ignore state_referenced_locally
	let disclaimer = $state(structuredClone(data.values.disclaimer));
	let errors = $state<Record<string, string>>({});
	let expanded = $state<HomepageSectionId | null>(null);

	const names: Record<HomepageSectionId, string> = {
		hero: 'Hero slideshow',
		intents: '"What brings you in?" cards',
		services: 'Services overview',
		process: 'How we care',
		doctors: 'Our doctors',
		locations: 'Locations & maps',
		certifications: 'Certifications',
		technology: 'Technology',
		amenities: 'Amenities',
		testimonials: 'Testimonials',
		insurance: 'Insurance & payment',
		membership: 'Membership plans',
		faq: 'FAQ',
		cta: 'Closing call-to-action'
	};
	const editLinks: Partial<Record<HomepageSectionId, string>> = {
		hero: '/admin/slides',
		intents: '/admin/content/intents',
		services: '/admin/services',
		process: '/admin/content/process',
		doctors: '/admin/doctors',
		locations: '/admin/locations',
		certifications: '/admin/certifications',
		technology: '/admin/content/technology',
		amenities: '/admin/content/amenities',
		testimonials: '/admin/content/testimonials',
		insurance: '/admin/content/insurance',
		membership: '/admin/content/membership',
		faq: '/admin/content/faqs'
	};
	const moduleOff = (id: HomepageSectionId) => {
		const m = SECTION_MODULE[id];
		return m ? !data.site.modules[m] : false;
	};
</script>

<PageHeader title="Homepage" description="Choose which sections appear, in what order, and their headings. Drag to reorder." />

<AdminForm payload={{ homepage, banner, disclaimer }} bind:errors>
	<div class="space-y-6">
		<section class="card overflow-hidden">
			{#snippet row(s: HomepageSection)}
				<div>
					<div class="flex flex-wrap items-center gap-3">
						<Toggle label="Show {names[s.id]}" bind:checked={s.enabled} compact />
						<button type="button" class="min-w-0 flex-1 text-left" onclick={() => (expanded = expanded === s.id ? null : s.id)} aria-expanded={expanded === s.id}>
							<span class="font-medium {s.enabled ? '' : 'text-muted line-through'}">{names[s.id]}</span>
							{#if s.heading && s.id !== 'hero'}<span class="block truncate text-sm text-muted">“{s.heading}”</span>{/if}
						</button>
						{#if moduleOff(s.id)}<span class="text-xs font-medium text-amber-700">module off</span>{/if}
						{#if editLinks[s.id]}<a class="text-sm text-primary-700 hover:underline" href={editLinks[s.id]}>Edit items</a>{/if}
					</div>
					{#if expanded === s.id && s.id !== 'hero'}
						<div class="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
							<TextField label="Small label above heading" bind:value={s.eyebrow} maxlength={80} />
							<TextField label="Heading" bind:value={s.heading} maxlength={160} />
							<TextField label="Intro text" type="textarea" rows={2} bind:value={s.intro} maxlength={600} class="sm:col-span-2" />
							{#if s.id === 'process'}
								<div class="sm:col-span-2"><ImageField label="Section photo" bind:value={s.image} maxWidth={1400} /></div>
							{/if}
						</div>
					{/if}
				</div>
			{/snippet}
			<SortableList bind:items={homepage.sections} key={(s) => s.id} label={(s) => names[s.id]} {row} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Site-wide notice banner</h2>
			<p class="text-sm text-muted">
				Shown above the header on every page — e.g. holiday closures or emergency care. Switch it on or off under <a class="link" href="/admin/settings/site">Modules</a> (currently <strong>{data.site.modules.banner ? 'on' : 'off'}</strong>).
			</p>
			<TextField label="Message" bind:value={banner.text} maxlength={300} />
			<div class="grid gap-4 sm:grid-cols-3">
				<TextField label="Link text" bind:value={banner.linkText} />
				<TextField label="Link" bind:value={banner.linkUrl} placeholder="/contact" />
				<SelectField label="Style" bind:value={banner.tone} options={[{ value: 'info', label: 'Information' }, { value: 'warning', label: 'Warning' }, { value: 'emergency', label: 'Emergency' }]} />
			</div>
			<Toggle label="Visitors can dismiss it" bind:checked={banner.dismissible} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Unofficial booking sites disclaimer</h2>
			<Toggle label="Show disclaimer (footer and booking page)" bind:checked={disclaimer.enabled} />
			<TextField label="Text" type="textarea" rows={3} bind:value={disclaimer.text} hint="Your official phone numbers are listed automatically after this text." />
		</section>
	</div>
</AdminForm>
