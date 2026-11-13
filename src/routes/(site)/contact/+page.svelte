<script lang="ts">
	import { enhance } from '$app/forms';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHero from '#lib/components/site/PageHero.svelte';
	import LocationCard from '#lib/components/site/LocationCard.svelte';
	import Turnstile from '#lib/components/site/Turnstile.svelte';
	import FaqList from '#lib/components/site/FaqList.svelte';
	import { telLink, whatsappLink } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const site = $derived(data.site);
	let submitting = $state(false);
	let token = $state('');
	const err = (k: string) => (form && 'errors' in form ? (form.errors as Record<string, string>)[k] : undefined);
	const val = (k: string) => (form && 'values' in form ? ((form.values as Record<string, string>)[k] ?? '') : '');
</script>

<Seo title="Contact us" description="Contact {site.clinic.name}: phone, WhatsApp, email and addresses for all {site.labels.locations.toLowerCase()}." />

<PageHero title="Get in touch" eyebrow="Contact" intro="Call or WhatsApp your nearest branch, or send us a message and we will get back to you.">
	<div class="flex flex-wrap gap-3">
		{#each site.clinic.phones.slice(0, 1) as p (p)}<a href={telLink(p)} class="btn-primary"><Icon name="phone" size={18} /> {p}</a>{/each}
		{#if site.clinic.whatsapp}<a href={whatsappLink(site.clinic.whatsapp)} target="_blank" rel="noopener" class="btn-outline"><Icon name="whatsapp" size={18} /> WhatsApp</a>{/if}
		{#if site.clinic.email}<a href="mailto:{site.clinic.email}" class="btn-outline"><Icon name="mail" size={18} /> {site.clinic.email}</a>{/if}
	</div>
</PageHero>

<div class="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr]">
	<section aria-labelledby="form-h">
		<h2 id="form-h" class="mb-2 text-2xl">Send a message</h2>
		<p class="mb-6 text-sm text-muted">
			For appointments, please use <a href="/book" class="link">{site.labels.bookCta.toLowerCase()}</a>. In an emergency, call the branch directly.
		</p>
		{#if form && 'sent' in form && form.sent}
			<div class="card border-primary bg-primary-50 p-6" role="status">
				<p class="font-heading text-xl">Thank you — message received.</p>
				<p class="mt-2 text-muted">We usually reply within one working day.</p>
			</div>
		{:else}
			<form
				method="POST"
				class="card space-y-4 p-6"
				novalidate
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update({ reset: false });
						submitting = false;
					};
				}}
			>
				{#if err('_form')}<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{err('_form')}</p>{/if}
				<div>
					<label for="c-name" class="label">Your name <span class="text-red-700" aria-hidden="true">*</span></label>
					<input id="c-name" name="name" class="input" autocomplete="name" required value={val('name')} aria-invalid={!!err('name')} aria-describedby={err('name') ? 'c-name-e' : undefined} />
					{#if err('name')}<p id="c-name-e" class="field-error">{err('name')}</p>{/if}
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="c-phone" class="label">Mobile number</label>
						<input id="c-phone" name="phone" type="tel" inputmode="tel" class="input" autocomplete="tel" value={val('phone')} aria-invalid={!!err('phone')} aria-describedby={err('phone') ? 'c-phone-e' : undefined} />
						{#if err('phone')}<p id="c-phone-e" class="field-error">{err('phone')}</p>{/if}
					</div>
					<div>
						<label for="c-email" class="label">Email</label>
						<input id="c-email" name="email" type="email" class="input" autocomplete="email" value={val('email')} aria-invalid={!!err('email')} aria-describedby={err('email') ? 'c-email-e' : undefined} />
						{#if err('email')}<p id="c-email-e" class="field-error">{err('email')}</p>{/if}
					</div>
				</div>
				{#if data.locations.length > 1}
					<div>
						<label for="c-loc" class="label">Branch (optional)</label>
						<select id="c-loc" name="locationId" class="input" value={val('locationId')}>
							<option value="">Any</option>
							{#each data.locations as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="c-msg" class="label">Message <span class="text-red-700" aria-hidden="true">*</span></label>
					<textarea id="c-msg" name="message" rows="5" class="input" required aria-invalid={!!err('message')} aria-describedby={err('message') ? 'c-msg-e' : undefined}>{val('message')}</textarea>
					{#if err('message')}<p id="c-msg-e" class="field-error">{err('message')}</p>{/if}
				</div>
				<div class="hidden" aria-hidden="true"><label>Leave empty <input name="website" tabindex="-1" autocomplete="off" /></label></div>
				<div>
					<label class="flex items-start gap-3 text-sm">
						<input type="checkbox" name="consent" class="mt-0.5 rounded text-primary" required aria-invalid={!!err('consent')} />
						<span>I agree to {site.clinic.name} using these details to reply to me, as described in the <a href="/privacy" class="link" target="_blank">privacy policy</a>.</span>
					</label>
					{#if err('consent')}<p class="field-error">{err('consent')}</p>{/if}
				</div>
				{#if site.turnstileSiteKey}<Turnstile siteKey={site.turnstileSiteKey} bind:token />{/if}
				<button class="btn-primary w-full sm:w-auto" disabled={submitting}>{submitting ? 'Sending…' : 'Send message'}</button>
			</form>
		{/if}
		{#if data.faqs.length}
			<h2 class="mt-12 mb-4 text-2xl">Common questions</h2>
			<FaqList items={data.faqs} />
		{/if}
	</section>

	<section aria-labelledby="branches-h">
		<h2 id="branches-h" class="mb-6 text-2xl">Our {site.labels.locations.toLowerCase()}</h2>
		<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
			{#each data.locations as loc (loc.id)}<li><LocationCard location={loc} timeZone={site.clinic.timeZone} locale={site.clinic.locale} booking={site.modules.booking} /></li>{/each}
		</ul>
	</section>
</div>
