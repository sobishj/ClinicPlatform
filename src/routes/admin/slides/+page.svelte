<script lang="ts">
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import AdminList from '#lib/admin/AdminList.svelte';
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import Modal from '#lib/admin/Modal.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ImageRef } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Slide = {
		id?: string;
		image: ImageRef | null;
		mobileImage: ImageRef | null;
		heading: string | null;
		subheading: string | null;
		buttonText: string | null;
		buttonLink: string | null;
		align: 'left' | 'center' | 'right';
		overlay: number;
		active: boolean;
	};
	let editing = $state<Slide | null>(null);
	let open = $state(false);
	let errors = $state<Record<string, string>>({});
	// svelte-ignore state_referenced_locally
	let hero = $state(structuredClone(data.values.hero));
	let heroErrors = $state<Record<string, string>>({});

	function edit(item?: (typeof data.items)[number]) {
		errors = {};
		editing = item
			? {
					id: item.id,
					image: item.image,
					mobileImage: item.mobileImage,
					heading: item.heading,
					subheading: item.subheading,
					buttonText: item.buttonText,
					buttonLink: item.buttonLink,
					align: item.align as Slide['align'],
					overlay: item.overlay,
					active: item.active
				}
			: { image: null, mobileImage: null, heading: '', subheading: '', buttonText: data.site.labels.bookCta, buttonLink: '/book', align: 'left', overlay: 35, active: true };
		open = true;
	}
</script>

<PageHeader title="Hero slides" description="Full-width photos at the top of the homepage that cross-fade into each other. With one slide, it shows as a still image.">
	{#snippet actions()}
		<button class="btn-primary" onclick={() => edit()}><Icon name="plus" size={16} /> Add slide</button>
	{/snippet}
</PageHeader>

<AdminList
	items={data.items}
	canWrite={true}
	title={(i) => i.heading || i.image.alt}
	subtitle={(i) => i.subheading ?? ''}
	image={(i) => i.image.url}
	onedit={edit}
	empty="No slides yet. Add at least one photo for the top of your homepage."
/>

<section class="mt-8">
	<h2 class="mb-3 font-sans text-lg font-semibold">Slideshow settings</h2>
	<AdminForm action="?/settings" payload={{ hero }} bind:errors={heroErrors} submitLabel="Save slideshow settings">
		<div class="card grid gap-4 p-5 sm:grid-cols-2">
			<TextField label="Time per slide (seconds)" type="number" bind:value={hero.intervalSeconds} min={2} max={30} error={heroErrors['hero.intervalSeconds']} />
			<TextField label="Cross-fade duration (ms)" type="number" bind:value={hero.transitionMs} min={200} max={3000} step={100} error={heroErrors['hero.transitionMs']} />
			<Toggle label="Pause while the mouse is over the slideshow" bind:checked={hero.pauseOnHover} />
			<Toggle label="Show dots" bind:checked={hero.showDots} />
			<Toggle label="Show arrows" bind:checked={hero.showArrows} />
			<p class="text-sm text-muted sm:col-span-2">Visitors who prefer reduced motion see the first slide without auto-play.</p>
		</div>
	</AdminForm>
</section>

<Modal bind:open title={editing?.id ? 'Edit slide' : 'Add slide'} size="xl">
	{#if editing}
		<AdminForm payload={editing} bind:errors bare onsuccess={() => (open = false)}>
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="space-y-4">
					<ImageField label="Desktop image" bind:value={editing.image} required maxWidth={1920} error={errors.image ?? errors['image.alt']} hint="Landscape, at least 1600px wide. Resized to 1920px." />
					<ImageField label="Mobile image (optional)" bind:value={editing.mobileImage} maxWidth={900} aspect={0.75} previewClass="aspect-[3/4]" hint="Portrait crop for phones." />
				</div>
				<div class="space-y-4">
					<TextField label="Heading" bind:value={editing.heading} maxlength={120} />
					<TextField label="Sub-heading" type="textarea" rows={2} bind:value={editing.subheading} maxlength={300} />
					<div class="grid gap-4 sm:grid-cols-2">
						<TextField label="Button text" bind:value={editing.buttonText} maxlength={40} />
						<TextField label="Button link" bind:value={editing.buttonLink} placeholder="/book" error={errors.buttonLink} />
					</div>
					<SelectField label="Text alignment" bind:value={editing.align} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
					<div>
						<label class="label" for="overlay">Overlay darkness: {editing.overlay}%</label>
						<input id="overlay" type="range" min="0" max="90" step="5" bind:value={editing.overlay} class="w-full accent-[var(--brand-primary)]" />
						<p class="hint">Darken the photo so white text stays readable.</p>
					</div>
					<Toggle label="Active" bind:checked={editing.active} />
					<!-- Preview -->
					{#if editing.image}
						<div class="relative aspect-video overflow-hidden rounded-lg">
							<img src={editing.image.url} alt="" class="absolute inset-0 h-full w-full object-cover" />
							<div class="absolute inset-0 bg-black" style="opacity:{editing.overlay / 100}"></div>
							<div class="relative flex h-full flex-col justify-center p-5 text-white {editing.align === 'center' ? 'items-center text-center' : editing.align === 'right' ? 'items-end text-right' : ''}">
								<p class="font-heading text-xl">{editing.heading}</p>
								<p class="text-sm opacity-90">{editing.subheading}</p>
								{#if editing.buttonText}<span class="btn-light btn-sm mt-2">{editing.buttonText}</span>{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div class="mt-6 flex justify-end border-t border-line pt-4"><button class="btn-primary">Save slide</button></div>
		</AdminForm>
	{/if}
</Modal>
