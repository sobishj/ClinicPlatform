<script lang="ts">
	interface Props {
		label: string;
		value: string;
		isSet?: boolean;
		fromEnv?: boolean;
		hint?: string;
	}
	let { label, value = $bindable(), isSet = false, fromEnv = false, hint }: Props = $props();
	const uid = $props.id();
</script>

<div>
	<label class="label" for="s-{uid}">{label}</label>
	{#if fromEnv}
		<p class="rounded-lg bg-primary-50 px-3 py-2 text-sm">Set by an environment variable.</p>
	{:else}
		<input
			id="s-{uid}"
			type="password"
			class="input font-mono"
			autocomplete="new-password"
			bind:value
			placeholder={isSet ? '•••••••• (saved — leave blank to keep)' : ''}
			aria-describedby="s-{uid}-h"
		/>
		<p id="s-{uid}-h" class="hint">{hint ?? (isSet ? 'A value is saved. It is never shown again.' : 'Not set.')}</p>
	{/if}
</div>
