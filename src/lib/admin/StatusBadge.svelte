<script lang="ts">
	import { STATUS_LABELS, type AppointmentStatus } from '#lib/types.js';
	let { status }: { status: string } = $props();
	const styles: Record<AppointmentStatus, string> = {
		new: 'bg-accent-100 text-accent-700',
		confirmed: 'bg-emerald-100 text-emerald-800',
		rescheduled: 'bg-sky-100 text-sky-800',
		completed: 'bg-gray-100 text-gray-700',
		cancelled: 'bg-red-50 text-red-700',
		no_show: 'bg-orange-50 text-orange-800'
	};
</script>

<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap {styles[status as AppointmentStatus] ?? 'bg-gray-100'}">
	{STATUS_LABELS[status as AppointmentStatus] ?? status}
</span>
