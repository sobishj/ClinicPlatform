<script lang="ts">
	/**
	 * "Open now / Closed" in the clinic time zone. Re-computed in the browser (pages may be
	 * served from cache) and refreshed every minute.
	 */
	import { onMount } from 'svelte';
	import { openStatus, type DateRange } from '#lib/time.js';
	import type { WeeklyHours } from '#lib/types.js';

	interface Props {
		hours: WeeklyHours;
		closures?: DateRange[];
		timeZone: string;
		locale?: string;
		compact?: boolean;
	}
	let { hours, closures = [], timeZone, locale = 'en-IN', compact = false }: Props = $props();
	let now = $state(Date.now());
	onMount(() => {
		now = Date.now();
		const t = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(t);
	});
	const status = $derived(openStatus(hours, closures, timeZone, now, locale));
</script>

<span class="inline-flex items-center gap-1.5 text-sm font-medium {status.open ? 'text-emerald-800' : 'text-muted'}">
	<span class="size-2 rounded-full {status.open ? 'bg-emerald-600' : 'bg-gray-400'}" aria-hidden="true"></span>
	{compact ? (status.open ? 'Open now' : 'Closed now') : status.label}
	{#if status.closureReason && !compact}<span class="text-muted">({status.closureReason})</span>{/if}
</span>
