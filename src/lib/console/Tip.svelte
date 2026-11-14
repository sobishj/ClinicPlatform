<script lang="ts">
	/** ⓘ explanation for a console page, section or setting. Texts live in help.ts. */
	import InfoTip from '../admin/InfoTip.svelte';
	import { CONSOLE_HELP, type ConsoleHelpKey } from './help.js';

	let {
		key,
		small = true,
		align = 'left'
	}: { key: ConsoleHelpKey; small?: boolean; align?: 'left' | 'right' } = $props();
	const help = $derived(CONSOLE_HELP[key]);
</script>

<InfoTip {help} title={help.name} label="About “{help.name}”" {small} {align} />
