<script lang="ts">
	import { browser } from '$app/env';
	import Icon from '../Icon.svelte';

	interface Props {
		text: string;
		linkText?: string;
		linkUrl?: string;
		tone: 'info' | 'warning' | 'emergency';
		dismissible: boolean;
	}
	let { text, linkText, linkUrl, tone, dismissible }: Props = $props();

	// Dismissal is remembered per message text.
	const key = $derived(`notice:${text.slice(0, 60)}`);
	let dismissed = $state(false);
	$effect(() => {
		if (!browser) return;
		try {
			dismissed = sessionStorage.getItem(key) === '1';
		} catch {
			/* storage blocked */
		}
	});
	function dismiss() {
		dismissed = true;
		try {
			sessionStorage.setItem(key, '1');
		} catch {
			/* ignore */
		}
	}
	const styles = {
		info: 'bg-primary-800 text-white',
		warning: 'bg-accent-100 text-ink',
		emergency: 'bg-red-700 text-white'
	};
</script>

{#if text && !dismissed}
	<div class="{styles[tone]} text-sm" role="region" aria-label="Notice">
		<div class="container-page flex items-center gap-3 py-2">
			<Icon name={tone === 'emergency' ? 'siren' : 'info'} size={18} class="shrink-0" />
			<p class="flex-1">
				{text}
				{#if linkText && linkUrl}<a href={linkUrl} class="ml-1 font-semibold underline underline-offset-2">{linkText}</a>{/if}
			</p>
			{#if dismissible}
				<button type="button" class="rounded p-1 hover:bg-black/10" aria-label="Dismiss notice" onclick={dismiss}><Icon name="x" size={16} /></button>
			{/if}
		</div>
	</div>
{/if}
