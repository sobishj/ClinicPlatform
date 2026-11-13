<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let { id }: { id: string } = $props();

	type Gtag = (...args: unknown[]) => void;
	const w = () => window as unknown as { dataLayer: unknown[]; gtag?: Gtag };

	onMount(() => {
		if (!/^G-[A-Z0-9]+$/.test(id)) return;
		const win = w();
		win.dataLayer = win.dataLayer || [];
		// gtag must push the `arguments` object itself.
		win.gtag = function () {
			// eslint-disable-next-line prefer-rest-params
			win.dataLayer.push(arguments);
		};
		win.gtag('js', new Date());
		win.gtag('config', id, { send_page_view: false });
		const s = document.createElement('script');
		s.async = true;
		s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
		document.head.appendChild(s);
	});

	afterNavigate(({ to }) => {
		w().gtag?.('event', 'page_view', { page_location: to?.url.href, page_title: document.title });
	});
</script>
