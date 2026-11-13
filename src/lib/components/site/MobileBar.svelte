<script lang="ts">
	import Icon from '../Icon.svelte';
	import { telLink, whatsappLink } from '#lib/format.js';

	interface Props {
		phone?: string;
		whatsapp?: string;
		booking: boolean;
		bookLabel: string;
	}
	let { phone, whatsapp, booking, bookLabel }: Props = $props();
	const count = $derived([phone, whatsapp, booking].filter(Boolean).length);
</script>

{#if count}
	<nav
		class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden"
		style="padding-bottom: env(safe-area-inset-bottom)"
		aria-label="Quick contact"
	>
		<ul class="grid h-16" style="grid-template-columns: repeat({count}, minmax(0, 1fr))">
			{#if phone}
				<li><a href={telLink(phone)} class="flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold text-ink"><Icon name="phone" size={20} /> Call</a></li>
			{/if}
			{#if whatsapp}
				<li><a href={whatsappLink(whatsapp)} target="_blank" rel="noopener" class="flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold text-ink"><Icon name="whatsapp" size={20} /> WhatsApp</a></li>
			{/if}
			{#if booking}
				<li class="p-2"><a href="/book" class="flex h-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-white"><Icon name="calendar-check" size={18} /> {bookLabel.replace(/ appointment/i, '')}</a></li>
			{/if}
		</ul>
	</nav>
{/if}
