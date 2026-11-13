<script lang="ts">
	import { WEEKDAYS, WEEKDAY_LABELS, type WeeklyHours, type Weekday } from '#lib/types.js';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		value: WeeklyHours;
		label?: string;
		/** Error map keyed like "mon.0" */
		errors?: Record<string, string>;
		defaultRange?: { open: string; close: string };
	}
	let { value = $bindable(), label = 'Weekly hours', errors = {}, defaultRange = { open: '09:30', close: '13:30' } }: Props = $props();

	function toggle(day: Weekday, open: boolean) {
		value = { ...value, [day]: open ? [{ ...defaultRange }] : [] };
	}
	function addRange(day: Weekday) {
		const ranges = value[day] ?? [];
		const last = ranges.at(-1);
		value = { ...value, [day]: [...ranges, last ? { open: '16:00', close: '20:00' } : { ...defaultRange }] };
	}
	function removeRange(day: Weekday, i: number) {
		value = { ...value, [day]: (value[day] ?? []).filter((_, j) => j !== i) };
	}
	function copyToAll(day: Weekday) {
		const ranges = value[day] ?? [];
		const next: WeeklyHours = {};
		for (const d of WEEKDAYS) next[d] = (value[d]?.length ? ranges : value[d] ?? []).map((r) => ({ ...r }));
		value = next;
	}
</script>

<fieldset>
	<legend class="label">{label}</legend>
	<div class="divide-y divide-line rounded-lg border border-line">
		{#each WEEKDAYS as day (day)}
			{@const ranges = value[day] ?? []}
			<div class="flex flex-wrap items-start gap-3 px-3 py-2.5">
				<label class="flex w-32 items-center gap-2 pt-2 text-sm font-medium">
					<input type="checkbox" class="rounded text-primary" checked={ranges.length > 0} onchange={(e) => toggle(day, e.currentTarget.checked)} />
					{WEEKDAY_LABELS[day]}
				</label>
				<div class="flex min-w-0 flex-1 flex-col gap-2">
					{#if !ranges.length}
						<span class="pt-2 text-sm text-muted">Closed</span>
					{/if}
					{#each ranges as r, i (i)}
						<div class="flex flex-wrap items-center gap-2">
							<input type="time" class="input w-32 py-1.5" bind:value={r.open} aria-label="{WEEKDAY_LABELS[day]} opens" />
							<span class="text-muted">to</span>
							<input type="time" class="input w-32 py-1.5" bind:value={r.close} aria-label="{WEEKDAY_LABELS[day]} closes" />
							<button type="button" class="btn-ghost btn-sm" aria-label="Remove time range" onclick={() => removeRange(day, i)}><Icon name="x" size={16} /></button>
							{#if errors[`${day}.${i}`]}<span class="field-error mt-0">{errors[`${day}.${i}`]}</span>{/if}
						</div>
					{/each}
				</div>
				{#if ranges.length}
					<div class="flex gap-1">
						<button type="button" class="btn-ghost btn-sm" onclick={() => addRange(day)} title="Add a second session (e.g. evening)">+ Session</button>
						<button type="button" class="btn-ghost btn-sm" onclick={() => copyToAll(day)} title="Copy these times to every open day">Copy to open days</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</fieldset>
