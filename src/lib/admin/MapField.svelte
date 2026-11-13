<script lang="ts">
	import { parseMapInput, isAllowedEmbedUrl } from '#lib/maps.js';

	interface Props {
		embedUrl: string | null;
		directionsUrl: string | null;
		latitude: number | null;
		longitude: number | null;
		error?: string;
	}
	let {
		embedUrl = $bindable(),
		directionsUrl = $bindable(),
		latitude = $bindable(),
		longitude = $bindable(),
		error
	}: Props = $props();

	let input = $state('');
	let message = $state('');
	let busy = $state(false);

	async function apply() {
		message = '';
		let result = parseMapInput(input);
		if (result.needsResolve) {
			busy = true;
			try {
				const res = await fetch('/admin/locations/resolve-map', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ url: input.trim() })
				});
				result = await res.json();
			} catch {
				result = { error: 'Could not expand the short link. Paste the full link or the embed code instead.' };
			} finally {
				busy = false;
			}
		}
		if (result.error) {
			message = result.error;
			return;
		}
		embedUrl = result.embedUrl ?? null;
		directionsUrl = result.directionsUrl ?? directionsUrl;
		if (result.latitude != null) latitude = result.latitude;
		if (result.longitude != null) longitude = result.longitude;
		input = '';
		message = 'Map updated — check the preview, then save.';
	}
</script>

<div class="space-y-3">
	<div>
		<label for="map-input" class="label">Google Maps link or embed code</label>
		<textarea
			id="map-input"
			class="input font-mono text-xs"
			rows="3"
			bind:value={input}
			placeholder={'Paste a Google Maps share link (https://maps.app.goo.gl/…) or the "Embed a map" <iframe …> code'}
			aria-describedby="map-help"
		></textarea>
		<p id="map-help" class="hint">
			In Google Maps: open your clinic → <strong>Share</strong> → copy the link, or choose <strong>Embed a map</strong> → copy HTML.
		</p>
		<button type="button" class="btn-outline btn-sm mt-2" disabled={!input.trim() || busy} onclick={apply}>
			{busy ? 'Reading link…' : 'Use this map'}
		</button>
		{#if message}<p class="mt-2 text-sm {message.startsWith('Map updated') ? 'text-primary-700' : 'text-red-700'}" role="status">{message}</p>{/if}
		{#if error}<p class="field-error">{error}</p>{/if}
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<div>
			<label class="label" for="lat">Latitude</label>
			<input id="lat" class="input" type="number" step="any" bind:value={latitude} />
		</div>
		<div>
			<label class="label" for="lng">Longitude</label>
			<input id="lng" class="input" type="number" step="any" bind:value={longitude} />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="dir">Directions link</label>
			<input id="dir" class="input text-sm" type="url" bind:value={directionsUrl} />
		</div>
	</div>

	{#if embedUrl && isAllowedEmbedUrl(embedUrl)}
		<div class="overflow-hidden rounded-lg border border-line">
			<iframe title="Map preview" src={embedUrl} class="h-64 w-full" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
		</div>
		<button type="button" class="text-sm text-red-700 hover:underline" onclick={() => (embedUrl = null)}>Remove map</button>
	{:else}
		<div class="flex h-32 items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">No map yet</div>
	{/if}
</div>
