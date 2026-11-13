<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import SelectField from '#lib/admin/SelectField.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import ListEditor from '#lib/admin/ListEditor.svelte';
	import { FONT_CHOICES } from '#lib/settings/schema.js';
	import { themeCss, googleFontsUrl } from '#lib/theme.js';
	import { THEME_PRESETS, matchingPreset, type ThemePreset } from '#lib/theme-presets.js';
	import { checkTheme } from '#lib/contrast.js';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let clinic = $state(structuredClone(data.values.clinic));
	// svelte-ignore state_referenced_locally
	let theme = $state(structuredClone(data.values.theme));
	let errors = $state<Record<string, string>>({});

	const timeZones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Kolkata', 'UTC'];
	const fontOptions = [...FONT_CHOICES];
	const previewStyle = $derived(themeCss(theme));

	// Colour themes
	const activePreset = $derived(matchingPreset(theme));
	const checks = $derived(checkTheme(theme));
	const failing = $derived(checks.filter((c) => !c.ok));
	// svelte-ignore state_referenced_locally
	let customOpen = $state(!matchingPreset(data.values.theme));
	function applyPreset(p: ThemePreset) {
		theme.primary = p.primary;
		theme.secondary = p.secondary;
		theme.accent = p.accent;
		theme.background = p.background;
		theme.card = p.card ?? '#ffffff';
	}
	const colourFields: Array<['primary' | 'secondary' | 'accent' | 'background' | 'card', string]> = [
		['primary', 'Primary (buttons, links)'],
		['secondary', 'Secondary (text, top bar, footer)'],
		['accent', 'Accent (highlights, badges)'],
		['background', 'Page background'],
		['card', 'Cards & panels']
	];
</script>

<svelte:head>
	<link rel="stylesheet" href={googleFontsUrl(theme)} />
</svelte:head>

<PageHeader title="Clinic & branding" description="Colour theme, logo, fonts and your clinic's contact details. Changes appear on the website as soon as you save." />

<AdminForm payload={{ clinic, theme }} bind:errors>
	<div class="grid gap-6 xl:grid-cols-[1fr_380px]">
		<div class="space-y-6">
			<section class="card space-y-4 p-5" aria-labelledby="theme-h">
				<div>
					<h2 id="theme-h" class="font-sans text-lg font-semibold">Colour theme</h2>
					<p class="text-sm text-muted">Pick a ready-made theme — each one is checked so all text stays easy to read. See it in the preview, then save.</p>
				</div>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Colour themes">
					{#each THEME_PRESETS as p (p.id)}
						{@const selected = activePreset?.id === p.id}
						<button
							type="button"
							role="radio"
							aria-checked={selected}
							class="group overflow-hidden rounded-xl border-2 text-left transition-shadow hover:shadow-md {selected ? 'border-ink' : 'border-line'}"
							onclick={() => applyPreset(p)}
						>
							<span class="flex h-14" style="background:{p.background}" aria-hidden="true">
								<span class="w-1/2" style="background:{p.primary}"></span>
								<span class="w-1/4" style="background:{p.secondary}"></span>
								<span class="w-1/4" style="background:{p.accent}"></span>
							</span>
							<span class="flex items-start justify-between gap-1 bg-white px-2.5 py-2">
								<span class="min-w-0">
									<span class="block text-sm font-semibold">{p.name}</span>
									<span class="block truncate text-xs text-muted">{p.description}</span>
								</span>
								{#if selected}<Icon name="check" size={16} class="mt-0.5 text-ink" />{/if}
							</span>
						</button>
					{/each}
				</div>

				<details class="rounded-lg border border-line" bind:open={customOpen}>
					<summary class="cursor-pointer px-4 py-3 text-sm font-semibold">
						Customise colours {#if !activePreset}<span class="ml-1 font-normal text-muted">(custom colours in use)</span>{/if}
					</summary>
					{#if customOpen}
					<div class="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
						{#each colourFields as [key, label] (key)}
							<div>
								<label class="label" for="c-{key}">{label}</label>
								<div class="flex gap-2">
									<input type="color" aria-label="{label} picker" class="h-11 w-14 cursor-pointer rounded-lg border border-line" bind:value={theme[key]} />
									<input id="c-{key}" class="input font-mono" bind:value={theme[key]} aria-invalid={!!errors[`theme.${key}`]} />
								</div>
								{#if errors[`theme.${key}`]}<p class="field-error">{errors[`theme.${key}`]}</p>{/if}
							</div>
						{/each}
						<p class="text-xs text-muted sm:col-span-2">Tip: start from the theme closest to your logo, then adjust the primary colour to match it exactly.</p>
					</div>
					{/if}
				</details>

				{#if checks.length}
					{#if failing.length}
						<div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
							<p class="flex items-center gap-2 font-semibold"><Icon name="info" size={18} /> Some text may be hard to read with these colours</p>
							<ul class="mt-2 space-y-1">
								{#each failing as c (c.label)}<li>• {c.label} — contrast {c.ratio}:1 (needs at least 4.5:1)</li>{/each}
							</ul>
							<p class="mt-2">Try a darker primary or secondary colour, a lighter background, or pick one of the themes above. You can still save.</p>
						</div>
					{:else}
						<p class="flex items-center gap-2 text-sm text-emerald-800" role="status"><Icon name="badge-check" size={18} /> All text is easy to read with these colours (WCAG AA).</p>
					{/if}
				{/if}
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Clinic profile</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<TextField label="Clinic name" bind:value={clinic.name} required error={errors['clinic.name']} />
					<TextField label="Short name" bind:value={clinic.shortName} hint="Used where space is tight" />
					<TextField label="Tagline" bind:value={clinic.tagline} class="sm:col-span-2" />
					<TextField label="Founded (year)" type="number" bind:value={clinic.foundedYear} min={1800} max={2100} />
				</div>
				<ListEditor label="Phone numbers" bind:items={clinic.phones} placeholder="+91 484 000 0000" max={5} hint="Shown in the top bar, footer and disclaimer." />
				<div class="grid gap-4 sm:grid-cols-2">
					<TextField label="WhatsApp number" bind:value={clinic.whatsapp} type="tel" hint="With country code, e.g. +91 90000 00000" />
					<TextField label="Email" bind:value={clinic.email} type="email" error={errors['clinic.email']} />
					<TextField label="Google reviews link" bind:value={clinic.googleReviewsUrl} type="url" class="sm:col-span-2" />
				</div>
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Social links</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<TextField label="Facebook" bind:value={clinic.social.facebook} type="url" />
					<TextField label="Instagram" bind:value={clinic.social.instagram} type="url" />
					<TextField label="YouTube" bind:value={clinic.social.youtube} type="url" />
					<TextField label="LinkedIn" bind:value={clinic.social.linkedin} type="url" />
					<TextField label="X (Twitter)" bind:value={clinic.social.x} type="url" />
					<TextField label="Google Business profile" bind:value={clinic.social.google} type="url" />
				</div>
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Region</h2>
				<div class="grid gap-4 sm:grid-cols-3">
					<SelectField label="Time zone" bind:value={clinic.timeZone} options={timeZones} />
					<TextField label="Currency" bind:value={clinic.currency} hint="ISO code, e.g. INR" maxlength={3} />
					<TextField label="Locale" bind:value={clinic.locale} hint="e.g. en-IN" />
				</div>
			</section>

			<section class="card space-y-5 p-5">
				<h2 class="font-sans text-lg font-semibold">Logo & icon</h2>
				<ImageField label="Logo" bind:value={clinic.logo} maxWidth={600} previewClass="aspect-[3/1] object-contain" hint="PNG or WebP with a transparent background works best." />
				<ImageField label="Logo for dark backgrounds" bind:value={clinic.logoDark} maxWidth={600} previewClass="aspect-[3/1] bg-gray-800" hint="Optional — used in the footer." />
				<ImageField label="Favicon" bind:value={clinic.favicon} maxWidth={256} aspect={1} previewClass="aspect-square" hint="Square image, at least 64×64." />
			</section>

			<section class="card space-y-4 p-5">
				<h2 class="font-sans text-lg font-semibold">Fonts & style</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<SelectField label="Heading font" bind:value={theme.headingFont} options={fontOptions} />
					<SelectField label="Body font" bind:value={theme.bodyFont} options={fontOptions} />
					<SelectField
						label="Corner style"
						bind:value={theme.radius}
						options={[
							{ value: 'square', label: 'Crisp' },
							{ value: 'soft', label: 'Soft' },
							{ value: 'round', label: 'Round' }
						]}
					/>
				</div>
			</section>
		</div>

		<!-- Live preview -->
		<aside class="xl:sticky xl:top-20 xl:self-start">
			<p class="mb-2 text-sm font-semibold text-muted">Live preview</p>
			<div style={previewStyle} class="overflow-hidden rounded-brand border border-line bg-surface shadow-sm">
				<div class="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
					{#if clinic.logo?.url}<img src={clinic.logo.url} alt="" class="size-8 object-contain" />{/if}
					<span class="font-heading text-lg font-semibold">{clinic.shortName || clinic.name}</span>
					<span class="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Book</span>
				</div>
				<div class="space-y-3 p-5">
					<p class="eyebrow">Welcome</p>
					<h3 class="font-heading text-2xl">{clinic.tagline || 'Your tagline here'}</h3>
					<p class="text-sm text-muted">Calm, unhurried care for the whole family.</p>
					<div class="flex flex-wrap gap-2">
						<span class="btn-primary btn-sm">Book Appointment</span>
						<span class="btn-outline btn-sm">Call us</span>
					</div>
					<div class="card flex items-center gap-3 p-3">
						<span class="flex size-10 items-center justify-center rounded-full bg-accent-100 text-accent-700">★</span>
						<div class="text-sm"><p class="font-semibold">A card</p><p class="text-muted">with accent colour</p></div>
					</div>
				</div>
				<div class="bg-secondary px-5 py-3 text-xs text-white/80">Footer · {clinic.phones[0] ?? ''}</div>
			</div>
		</aside>
	</div>
</AdminForm>
