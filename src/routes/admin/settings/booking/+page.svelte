<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let booking = $state(structuredClone(data.values.booking));
	let errors = $state<Record<string, string>>({});
	const e = (k: string) => errors[`booking.${k}`];
</script>

<PageHeader title="Booking" description="How visitors request appointments. Most clinics keep the default request form and confirm by phone." />

<AdminForm payload={{ booking }} bind:errors>
	<div class="space-y-6">
		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Booking mode</h2>
			<fieldset class="grid gap-3 sm:grid-cols-2">
				<legend class="sr-only">Booking mode</legend>
				{#each [{ v: 'request', t: 'Appointment request (recommended)', d: 'Visitors choose a branch, doctor, day and time of day. Staff call back to confirm.' }, { v: 'slots', t: 'Live time slots', d: 'Visitors pick an exact time from doctors’ schedules. Requires schedules for every doctor.' }] as o (o.v)}
					<label class="card flex cursor-pointer gap-3 p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
						<input type="radio" name="mode" value={o.v} bind:group={booking.mode} class="mt-1 text-primary" />
						<span><span class="block font-semibold">{o.t}</span><span class="text-sm text-muted">{o.d}</span></span>
					</label>
				{/each}
			</fieldset>
			<p class="hint">Live slots can also be switched on for individual branches only (Locations → Booking mode).</p>
			<div class="grid gap-4 sm:grid-cols-3">
				<TextField label="Slot length (minutes)" type="number" bind:value={booking.slotMinutes} min={5} max={240} error={e('slotMinutes')} hint="Services can override this" />
				<TextField label="Minimum notice (hours)" type="number" bind:value={booking.minNoticeHours} min={0} error={e('minNoticeHours')} />
				<TextField label="Book up to (days ahead)" type="number" bind:value={booking.maxDaysAhead} min={1} max={365} error={e('maxDaysAhead')} />
			</div>
		</section>

		<section class="card space-y-3 p-5">
			<h2 class="font-sans text-lg font-semibold">Form fields</h2>
			<Toggle label="Show a service dropdown" bind:checked={booking.showServiceDropdown} />
			<Toggle label="Require email address" bind:checked={booking.requireEmail} />
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField label="Mobile number pattern (regular expression)" bind:value={booking.phonePattern} mono error={e('phonePattern')} hint="Default accepts Indian mobile numbers with optional +91 or 0." />
				<TextField label="Mobile number hint" bind:value={booking.phoneHint} />
			</div>
			<TextField label="Consent text" type="textarea" rows={3} bind:value={booking.consentText} hint="Shown next to the required consent checkbox, with a link to the privacy policy." />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Thank-you screen</h2>
			<TextField label="Heading" bind:value={booking.thankYouHeading} />
			<TextField label="Message" type="textarea" rows={3} bind:value={booking.thankYouMessage} />
		</section>

		<section class="card space-y-4 p-5">
			<h2 class="font-sans text-lg font-semibold">Spam limits</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField label="Max requests per IP address per hour" type="number" bind:value={booking.maxPerIpPerHour} min={1} />
				<TextField label="Max requests per phone number per day" type="number" bind:value={booking.maxPerPhonePerDay} min={1} />
			</div>
		</section>
	</div>
</AdminForm>
