<script lang="ts">
	/** Cloudflare Turnstile widget. Writes the token into a hidden `cf-turnstile-response` input. */
	import { onMount } from 'svelte';

	interface Props {
		siteKey: string;
		/** Bindable: current token ('' until solved). */
		token?: string;
	}
	let { siteKey, token = $bindable('') }: Props = $props();
	let el: HTMLDivElement | undefined = $state();

	type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id?: string) => void };
	const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

	function load(): Promise<TurnstileApi> {
		const w = window as unknown as { turnstile?: TurnstileApi; __tsLoading?: Promise<TurnstileApi> };
		if (w.turnstile) return Promise.resolve(w.turnstile);
		w.__tsLoading ??= new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = SRC;
			s.async = true;
			s.onload = () => resolve(w.turnstile!);
			s.onerror = reject;
			document.head.appendChild(s);
		});
		return w.__tsLoading;
	}

	onMount(() => {
		let id: string | undefined;
		let api: TurnstileApi | undefined;
		load()
			.then((t) => {
				api = t;
				if (!el) return;
				id = t.render(el, {
					sitekey: siteKey,
					'response-field': false,
					callback: (tk: string) => (token = tk),
					'expired-callback': () => (token = ''),
					'error-callback': () => (token = '')
				});
			})
			.catch(() => console.warn('Turnstile could not load'));
		return () => {
			if (api && id) api.remove(id);
		};
	});
</script>

<div bind:this={el} class="min-h-[65px]"></div>
<input type="hidden" name="cf-turnstile-response" value={token} />
