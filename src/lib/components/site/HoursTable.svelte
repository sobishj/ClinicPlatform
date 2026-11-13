<script lang="ts">
	import { onMount } from 'svelte';
	import { WEEKDAYS, WEEKDAY_LABELS, type WeeklyHours } from '#lib/types.js';
	import { formatRanges, zonedParts } from '#lib/time.js';

	interface Props {
		hours: WeeklyHours;
		timeZone: string;
		locale?: string;
		caption?: string;
	}
	let { hours, timeZone, locale = 'en-IN', caption = 'Opening hours' }: Props = $props();
	let today = $state('');
	onMount(() => (today = zonedParts(Date.now(), timeZone).weekday));
</script>

<table class="w-full text-sm">
	<caption class="sr-only">{caption}</caption>
	<tbody class="divide-y divide-line">
		{#each WEEKDAYS as d (d)}
			<tr class={today === d ? 'font-semibold text-ink' : ''}>
				<th scope="row" class="py-2 pr-4 text-left font-medium">{WEEKDAY_LABELS[d]}{#if today === d}<span class="sr-only"> (today)</span>{/if}</th>
				<td class="py-2 text-right {hours[d]?.length ? '' : 'text-muted'}">{formatRanges(hours[d], locale)}</td>
			</tr>
		{/each}
	</tbody>
</table>
