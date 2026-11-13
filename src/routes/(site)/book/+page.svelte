<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Seo from '#lib/components/Seo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Turnstile from '#lib/components/site/Turnstile.svelte';
	import { availableDays, type WindowKey } from '#lib/booking/availability.js';
	import { summariseHours, zonedParts, addDays } from '#lib/time.js';
	import { fullAddress, telLink } from '#lib/format.js';
	import { doctorName } from '#lib/links.js';
	import { TIME_WINDOWS } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const site = $derived(data.site);
	const ctx = $derived(data.ctx);
	const l = $derived(site.labels);
	const tz = $derived(site.clinic.timeZone);
	const locale = $derived(site.clinic.locale);

	// ── form state (initialised from presets / a failed submission) ──
	// svelte-ignore state_referenced_locally
	const prev = (form && 'values' in form ? form.values : {}) as Record<string, string>;
	// svelte-ignore state_referenced_locally
	const presetDoctor = data.preset.doctorId;
	// svelte-ignore state_referenced_locally
	const doctorBranches = data.ctx.doctors.find((d) => d.id === presetDoctor)?.branches.map((b) => b.locationId) ?? [];
	// svelte-ignore state_referenced_locally
	let locationId = $state(prev.locationId ?? (data.preset.locationId || (data.ctx.locations.length === 1 ? data.ctx.locations[0].id : doctorBranches.length === 1 ? doctorBranches[0] : '')));
	// svelte-ignore state_referenced_locally
	let doctorId = $state(prev.doctorId ?? presetDoctor);
	// svelte-ignore state_referenced_locally
	let serviceId = $state(prev.serviceId ?? data.preset.serviceId);
	let date = $state(prev.date ?? '');
	let timeWindow = $state<string>(prev.timeWindow ?? '');
	let slot = $state(prev.slot ?? '');
	let name = $state(prev.name ?? '');
	let phone = $state(prev.phone ?? '');
	let email = $state(prev.email ?? '');
	let notes = $state(prev.notes ?? '');
	let consent = $state(false);
	let token = $state('');
	let submitting = $state(false);
	let js = $state(false);
	onMount(() => (js = true));

	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);

	// ── derived choices ──
	const location = $derived(ctx.locations.find((x) => x.id === locationId));
	const doctor = $derived(ctx.doctors.find((d) => d.id === doctorId));
	const locationChoices = $derived(presetDoctor ? ctx.locations.filter((x) => doctorBranches.includes(x.id)) : ctx.locations);
	const doctorsHere = $derived(ctx.doctors.filter((d) => d.branches.some((b) => b.locationId === locationId)));
	const servicesHere = $derived(ctx.services.filter((s) => !locationId || s.locationIds.includes(locationId)));
	const mode = $derived(location?.mode ?? site.booking.mode);

	// If the location changes and the chosen doctor doesn't work there, reset the doctor.
	$effect(() => {
		if (doctorId && locationId && !doctorsHere.some((d) => d.id === doctorId)) doctorId = '';
	});

	const days = $derived.by(() => {
		if (!location) return [];
		const branch = doctor?.branches.find((b) => b.locationId === location.id);
		return availableDays(
			{ hours: location.hours, closures: location.closures, doctorSchedule: branch?.schedule ?? null, doctorLeaves: doctor?.leaves ?? [] },
			{ tz, now: Date.now(), maxDaysAhead: site.booking.maxDaysAhead, minNoticeHours: site.booking.minNoticeHours }
		);
	});
	const day = $derived(days.find((d) => d.ymd === date));
	$effect(() => {
		// Clear a date/window that's no longer valid after changing branch or doctor.
		if (date && days.length && !day) {
			date = '';
			timeWindow = '';
			slot = '';
		}
		if (day && timeWindow && timeWindow !== 'slot' && !day.windows.includes(timeWindow as WindowKey)) timeWindow = '';
	});

	// Live slots
	let slots = $state<Array<{ start: number; time: string }>>([]);
	let slotsLoading = $state(false);
	$effect(() => {
		if (mode !== 'slots' || !locationId || !date) return;
		const params = new URLSearchParams({ location: locationId, date });
		if (doctorId) params.set('doctor', doctorId);
		if (serviceId) params.set('service', serviceId);
		slotsLoading = true;
		const ctrl = new AbortController();
		fetch(`/book/slots?${params}`, { signal: ctrl.signal })
			.then((r) => r.json())
			.then((j) => {
				slots = j.slots ?? [];
				if (slot && !slots.some((s) => String(s.start) === slot)) slot = '';
			})
			.catch(() => {})
			.finally(() => (slotsLoading = false));
		return () => ctrl.abort();
	});
	$effect(() => {
		if (mode === 'slots') timeWindow = 'slot';
		else if (timeWindow === 'slot') timeWindow = '';
	});

	// ── steps ──
	type StepKey = 'location' | 'doctor' | 'when' | 'details';
	const steps = $derived(
		(
			[
				ctx.locations.length > 1 && !(presetDoctor && doctorBranches.length === 1) ? 'location' : null,
				site.modules.doctors && !presetDoctor && ctx.doctors.length ? 'doctor' : null,
				'when',
				'details'
			] as Array<StepKey | null>
		).filter((x): x is StepKey => !!x)
	);
	// svelte-ignore state_referenced_locally
	let current = $state<StepKey>(
		(() => {
			// Start at the first incomplete step.
			if (prev.name) return 'details';
			if (!locationId && data.ctx.locations.length > 1) return 'location';
			return data.preset.locationId && !presetDoctor && data.site.modules.doctors && data.ctx.doctors.length ? 'doctor' : 'when';
		})()
	);
	const stepIndex = $derived(Math.max(0, steps.indexOf(current)));
	const stepTitles: Record<StepKey, string> = { location: 'Choose a branch', doctor: 'Choose a doctor', when: 'Choose a day and time', details: 'Your details' };

	let headingEl: HTMLHeadingElement | undefined = $state();
	async function goTo(k: StepKey) {
		current = k;
		await tick();
		headingEl?.focus();
		headingEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}
	const next = () => goTo(steps[Math.min(stepIndex + 1, steps.length - 1)]);
	const back = () => goTo(steps[Math.max(stepIndex - 1, 0)]);

	const canContinue = $derived(
		current === 'location' ? !!locationId : current === 'doctor' ? true : current === 'when' ? !!date && (mode === 'slots' ? !!slot : !!timeWindow) : true
	);

	// Jump to the step holding the first server error.
	$effect(() => {
		const keys = Object.keys(errors);
		if (!keys.length) return;
		const k = keys[0];
		const target: StepKey = k === 'locationId' ? 'location' : k === 'doctorId' ? 'doctor' : ['date', 'timeWindow', 'slot'].includes(k) ? 'when' : 'details';
		if (steps.includes(target)) current = target;
	});

	// ── formatting ──
	const fmtDay = (ymd: string) => {
		const d = new Date(ymd + 'T00:00:00Z');
		return {
			wd: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d),
			dm: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d),
			long: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
		};
	};
	const todayYmd = $derived(zonedParts(Date.now(), tz).ymd);
	const relDay = (ymd: string) => (ymd === todayYmd ? 'Today' : ymd === addDays(todayYmd, 1) ? 'Tomorrow' : fmtDay(ymd).wd);
	const windowHint: Record<WindowKey, string> = { morning: 'Before 12 pm', afternoon: '12 – 4 pm', evening: 'After 4 pm' };
	const slotLabel = $derived(slots.find((s) => String(s.start) === slot)?.time);
</script>

<Seo title={l.bookCta} description="Request an appointment at {site.clinic.name}. Choose a branch, a day and a time that suits you — we will call to confirm." />

<section class="bg-surface-2">
	<div class="container-page py-10 sm:py-12">
		<p class="eyebrow mb-2">{site.clinic.name}</p>
		<h1 class="text-3xl sm:text-4xl">{l.bookCta}</h1>
		<p class="lead mt-2 max-w-2xl">
			{mode === 'slots' ? 'Pick a time that suits you.' : 'Tell us when suits you — our team will call to confirm.'} It takes about a minute.
		</p>
	</div>
</section>

<div class="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
	<form
		method="POST"
		novalidate
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
		class="min-w-0"
	>
		<!-- Values carried by the stepper -->
		{#if js}
			<input type="hidden" name="locationId" value={locationId} />
			<input type="hidden" name="doctorId" value={doctorId} />
			<input type="hidden" name="date" value={date} />
			<input type="hidden" name="timeWindow" value={timeWindow} />
			<input type="hidden" name="slot" value={slot} />
		{/if}

		{#if errors._form}<p class="mb-5 rounded-lg bg-red-50 px-4 py-3 text-red-800" role="alert">{errors._form}</p>{/if}

		{#if !js}
			<!-- No-JavaScript fallback: one simple form -->
			<div class="card space-y-4 p-6">
				<div>
					<label for="nj-loc" class="label">{l.location}</label>
					<select id="nj-loc" name="locationId" class="input" required>
						{#each ctx.locations as loc (loc.id)}<option value={loc.id} selected={loc.id === locationId}>{loc.name}</option>{/each}
					</select>
				</div>
				{#if site.modules.doctors}
					<div>
						<label for="nj-doc" class="label">{l.doctor} (optional)</label>
						<select id="nj-doc" name="doctorId" class="input">
							<option value="">No preference</option>
							{#each ctx.doctors as d (d.id)}<option value={d.id} selected={d.id === doctorId}>{doctorName(d)}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="nj-date" class="label">Preferred date</label>
					<input id="nj-date" name="date" type="date" class="input" required value={date} />
				</div>
				<fieldset>
					<legend class="label">Preferred time</legend>
					{#each Object.entries(TIME_WINDOWS) as [k, w] (k)}
						<label class="mr-4 inline-flex items-center gap-2"><input type="radio" name="timeWindow" value={k} checked={timeWindow === k} /> {w.label}</label>
					{/each}
				</fieldset>
			</div>
		{:else}
			<p class="mb-2 text-sm font-medium text-muted" aria-live="polite">Step {stepIndex + 1} of {steps.length}</p>
			<div class="mb-6 flex gap-1.5" aria-hidden="true">
				{#each steps as s, i (s)}<span class="h-1.5 flex-1 rounded-full {i <= stepIndex ? 'bg-primary' : 'bg-line'}"></span>{/each}
			</div>
			<h2 bind:this={headingEl} tabindex="-1" class="mb-5 scroll-mt-28 text-2xl outline-none">{stepTitles[current]}</h2>
		{/if}

		{#if js && current === 'location'}
			<fieldset>
				<legend class="sr-only">{stepTitles.location}</legend>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each locationChoices as loc (loc.id)}
						<label class="card flex cursor-pointer gap-4 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary">
							<input type="radio" name="_loc" value={loc.id} bind:group={locationId} class="mt-1 text-primary" onchange={() => setTimeout(next, 150)} />
							<span class="min-w-0">
								<span class="block font-heading text-lg">{loc.name} <span class="ml-1 align-middle text-xs font-sans font-semibold text-primary-800">{loc.type}</span></span>
								<span class="block text-sm text-muted">{fullAddress(loc)}</span>
								<span class="mt-1 block text-xs text-muted">{summariseHours(loc.hours, locale).map((h) => `${h.days} ${h.hours}`).join(' · ')}</span>
							</span>
						</label>
					{/each}
				</div>
				{#if errors.locationId}<p class="field-error">{errors.locationId}</p>{/if}
			</fieldset>
		{/if}

		{#if js && current === 'doctor'}
			<fieldset>
				<legend class="sr-only">{stepTitles.doctor}</legend>
				<p class="mb-4 text-sm text-muted">Optional — choose “No preference” and we will find the right person for you.</p>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="card flex cursor-pointer items-center gap-4 p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary">
						<input type="radio" name="_doc" value="" bind:group={doctorId} class="text-primary" />
						<span class="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Icon name="users" /></span>
						<span><span class="block font-semibold">No preference</span><span class="text-sm text-muted">First available {l.doctor.toLowerCase()}</span></span>
					</label>
					{#each doctorsHere as d (d.id)}
						<label class="card flex cursor-pointer items-center gap-4 p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary">
							<input type="radio" name="_doc" value={d.id} bind:group={doctorId} class="text-primary" />
							{#if d.photo}<img src={d.photo.url} alt="" width="48" height="48" class="size-12 rounded-full object-cover" />{/if}
							<span class="min-w-0"><span class="block font-semibold">{doctorName(d)}</span><span class="block truncate text-sm text-muted">{d.specialities.slice(0, 2).join(' · ')}</span></span>
						</label>
					{/each}
				</div>
				{#if errors.doctorId}<p class="field-error">{errors.doctorId}</p>{/if}
			</fieldset>
		{/if}

		{#if js && current === 'when'}
			<div class="space-y-6">
				{#if errors.date || errors.timeWindow || errors.slot}
					<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{errors.date ?? errors.timeWindow ?? errors.slot}</p>
				{/if}
				<fieldset>
					<legend class="label">Day</legend>
					{#if !days.length}
						<p class="card p-5 text-sm">No online times in the next {site.booking.maxDaysAhead} days. Please call {#if location?.phones[0]}<a href={telLink(location.phones[0])} class="link">{location.phones[0]}</a>{:else}the branch{/if}.</p>
					{:else}
						<div class="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
							{#each days.slice(0, 21) as d (d.ymd)}
								{@const f = fmtDay(d.ymd)}
								<label class="flex w-20 shrink-0 cursor-pointer snap-start flex-col items-center rounded-xl border border-line bg-white px-2 py-2.5 text-center has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white">
									<input type="radio" name="_date" value={d.ymd} bind:group={date} class="sr-only" />
									<span class="text-xs font-semibold uppercase">{relDay(d.ymd)}</span>
									<span class="text-sm">{f.dm}</span>
								</label>
							{/each}
						</div>
						{#if days.length > 21}
							<label class="mt-3 flex items-center gap-2 text-sm">
								<span class="text-muted">Later date:</span>
								<select class="input max-w-56 py-1.5" value={date} onchange={(e) => (date = e.currentTarget.value)}>
									<option value="">Choose…</option>
									{#each days.slice(21) as d (d.ymd)}<option value={d.ymd}>{fmtDay(d.ymd).long}</option>{/each}
								</select>
							</label>
						{/if}
					{/if}
					
				</fieldset>

				{#if day}
					{#if mode === 'slots'}
						<fieldset>
							<legend class="label">Time on {fmtDay(day.ymd).long}</legend>
							{#if slotsLoading}<p class="text-sm text-muted" aria-live="polite">Loading times…</p>
							{:else if !slots.length}<p class="text-sm text-muted">No free times left on this day. Please choose another day.</p>
							{:else}
								<div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
									{#each slots as s (s.start)}
										<label class="cursor-pointer rounded-lg border border-line bg-white py-2 text-center text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white">
											<input type="radio" name="_slot" value={String(s.start)} bind:group={slot} class="sr-only" />{s.time}
										</label>
									{/each}
								</div>
							{/if}
							
						</fieldset>
					{:else}
						<fieldset>
							<legend class="label">Time of day on {fmtDay(day.ymd).long}</legend>
							<div class="grid gap-2 sm:grid-cols-3">
								{#each day.windows as w (w)}
									<label class="card flex cursor-pointer items-center gap-3 p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary">
										<input type="radio" name="_win" value={w} bind:group={timeWindow} class="text-primary" />
										<span><span class="block font-semibold">{TIME_WINDOWS[w].label}</span><span class="text-sm text-muted">{windowHint[w]}</span></span>
									</label>
								{/each}
							</div>
							
						</fieldset>
					{/if}
				{/if}
			</div>
		{/if}

		{#if !js || current === 'details'}
			<div class="card mt-0 space-y-4 p-6 {js ? '' : 'mt-6'}">
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="sm:col-span-2">
						<label for="b-name" class="label">Patient name <span class="text-red-700" aria-hidden="true">*</span></label>
						<input id="b-name" name="name" bind:value={name} class="input" autocomplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'b-name-e' : undefined} />
						{#if errors.name}<p id="b-name-e" class="field-error">{errors.name}</p>{/if}
					</div>
					<div>
						<label for="b-phone" class="label">Mobile number <span class="text-red-700" aria-hidden="true">*</span></label>
						<input id="b-phone" name="phone" type="tel" inputmode="tel" bind:value={phone} class="input" autocomplete="tel" required aria-invalid={!!errors.phone} aria-describedby="b-phone-h{errors.phone ? ' b-phone-e' : ''}" />
						<p id="b-phone-h" class="hint">{site.booking.phoneHint} — we will call you on this number.</p>
						{#if errors.phone}<p id="b-phone-e" class="field-error">{errors.phone}</p>{/if}
					</div>
					<div>
						<label for="b-email" class="label">Email {site.booking.requireEmail ? '' : '(optional)'}</label>
						<input id="b-email" name="email" type="email" bind:value={email} class="input" autocomplete="email" required={site.booking.requireEmail} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'b-email-e' : undefined} />
						{#if errors.email}<p id="b-email-e" class="field-error">{errors.email}</p>{/if}
					</div>
					{#if site.booking.showServiceDropdown && servicesHere.length}
						<div class="sm:col-span-2">
							<label for="b-svc" class="label">Reason for visit (optional)</label>
							<select id="b-svc" name="serviceId" bind:value={serviceId} class="input" aria-invalid={!!errors.serviceId}>
								<option value="">Not sure / general consultation</option>
								{#each servicesHere as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
							</select>
							{#if errors.serviceId}<p class="field-error">{errors.serviceId}</p>{/if}
						</div>
					{/if}
					<div class="sm:col-span-2">
						<label for="b-notes" class="label">Anything we should know? (optional)</label>
						<textarea id="b-notes" name="notes" rows="3" bind:value={notes} class="input" maxlength="1000"></textarea>
					</div>
				</div>
				<div class="hidden" aria-hidden="true"><label>Leave empty <input name="website" tabindex="-1" autocomplete="off" /></label></div>
				<div>
					<label class="flex items-start gap-3 text-sm">
						<input type="checkbox" name="consent" bind:checked={consent} class="mt-0.5 rounded text-primary" required aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'b-consent-e' : undefined} />
						<span>{site.booking.consentText} <a href="/privacy" target="_blank" class="link">Privacy policy</a></span>
					</label>
					{#if errors.consent}<p id="b-consent-e" class="field-error">{errors.consent}</p>{/if}
				</div>
				{#if site.turnstileSiteKey}<Turnstile siteKey={site.turnstileSiteKey} bind:token />{/if}
			</div>
		{/if}

		<!-- Navigation -->
		<div class="mt-6 flex flex-wrap items-center gap-3">
			{#if js && stepIndex > 0}<button type="button" class="btn-ghost" onclick={back}><Icon name="arrow-left" size={18} /> Back</button>{/if}
			<span class="flex-1"></span>
			{#if js && current !== 'details'}
				<button type="button" class="btn-primary" disabled={!canContinue} onclick={next}>Continue <Icon name="arrow-right" size={18} /></button>
			{:else}
				<button type="submit" class="btn-primary px-6" disabled={submitting || (js && !consent)}>
					{submitting ? 'Sending…' : mode === 'slots' ? 'Book this time' : 'Send request'}
				</button>
			{/if}
		</div>
	</form>

	<!-- Summary -->
	<aside class="lg:sticky lg:top-28 lg:self-start" aria-label="Your choices">
		<div class="card divide-y divide-line">
			<div class="p-5">
				<p class="text-xs font-semibold tracking-wider text-muted uppercase">{l.location}</p>
				{#if location}
					<p class="mt-1 font-semibold">{location.name}</p>
					<p class="text-sm text-muted">{fullAddress(location)}</p>
					{#if js && steps.includes('location') && current !== 'location'}<button type="button" class="mt-1 text-sm text-primary-700 hover:underline" onclick={() => goTo('location')}>Change</button>{/if}
				{:else}<p class="mt-1 text-sm text-muted">Not chosen yet</p>{/if}
			</div>
			{#if site.modules.doctors}
				<div class="p-5">
					<p class="text-xs font-semibold tracking-wider text-muted uppercase">{l.doctor}</p>
					<p class="mt-1 font-semibold">{doctor ? doctorName(doctor) : 'No preference'}</p>
					{#if js && steps.includes('doctor') && current !== 'doctor'}<button type="button" class="mt-1 text-sm text-primary-700 hover:underline" onclick={() => goTo('doctor')}>Change</button>{/if}
				</div>
			{/if}
			<div class="p-5">
				<p class="text-xs font-semibold tracking-wider text-muted uppercase">When</p>
				{#if day}
					<p class="mt-1 font-semibold">{fmtDay(day.ymd).long}</p>
					<p class="text-sm text-muted">{mode === 'slots' ? (slotLabel ?? 'Choose a time') : timeWindow && timeWindow !== 'slot' ? TIME_WINDOWS[timeWindow as WindowKey].label : 'Choose a time of day'}</p>
					{#if js && current === 'details'}<button type="button" class="mt-1 text-sm text-primary-700 hover:underline" onclick={() => goTo('when')}>Change</button>{/if}
				{:else}<p class="mt-1 text-sm text-muted">Not chosen yet</p>{/if}
			</div>
			{#if location?.phones[0]}
				<div class="bg-surface-2 p-5 text-sm">
					Prefer to talk? Call <a href={telLink(location.phones[0])} class="link">{location.phones[0]}</a>
				</div>
			{/if}
		</div>
		{#if site.disclaimer.enabled}<p class="mt-4 text-xs text-muted">{site.disclaimer.text}</p>{/if}
	</aside>
</div>
