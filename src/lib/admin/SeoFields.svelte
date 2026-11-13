<script lang="ts">
	import type { SeoFields } from '#lib/types.js';

	interface Props {
		value: SeoFields | null;
		fallbackTitle?: string;
	}
	let { value = $bindable(), fallbackTitle = '' }: Props = $props();
	let open = $state(false);
	const uid = $props.id();

	function ensure() {
		if (!value) value = { title: '', description: '', ogImage: '' };
		return value;
	}
</script>

<details class="card p-5" bind:open>
	<summary class="cursor-pointer font-sans text-lg font-semibold">Search engines & sharing <span class="text-sm font-normal text-muted">(optional)</span></summary>
	<div class="mt-4 space-y-4">
		<div>
			<label class="label" for="seo-t-{uid}">Page title</label>
			<input id="seo-t-{uid}" class="input" maxlength="120" placeholder={fallbackTitle} value={value?.title ?? ''} oninput={(e) => (ensure().title = e.currentTarget.value)} />
		</div>
		<div>
			<label class="label" for="seo-d-{uid}">Meta description</label>
			<textarea id="seo-d-{uid}" class="input" rows="2" maxlength="320" value={value?.description ?? ''} oninput={(e) => (ensure().description = e.currentTarget.value)}></textarea>
			<p class="hint">About 150 characters. Leave blank to use the summary.</p>
		</div>
		<div>
			<label class="label" for="seo-o-{uid}">Social image URL</label>
			<input id="seo-o-{uid}" class="input" placeholder="Defaults to the main photo" value={value?.ogImage ?? ''} oninput={(e) => (ensure().ogImage = e.currentTarget.value)} />
		</div>
	</div>
</details>
