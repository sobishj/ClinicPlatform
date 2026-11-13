<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import { toasts } from './toast.svelte.js';

	interface Props {
		action?: string;
		/** State object serialised as JSON into the `payload` field. */
		payload: unknown;
		errors?: Record<string, string>;
		children: Snippet;
		actions?: Snippet<[{ submitting: boolean }]>;
		submitLabel?: string;
		successMessage?: string;
		onsuccess?: (data: Record<string, unknown> | undefined) => void;
		class?: string;
		/** Hide the default sticky save bar. */
		bare?: boolean;
	}

	let {
		action = '?/save',
		payload,
		errors = $bindable({}),
		children,
		actions,
		submitLabel = 'Save changes',
		successMessage = 'Saved',
		onsuccess,
		class: klass = '',
		bare = false
	}: Props = $props();

	let submitting = $state(false);
	let message = $state('');
</script>

<form
	method="POST"
	{action}
	class={klass}
	use:enhance={() => {
		submitting = true;
		message = '';
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') {
				errors = {};
				toasts.push(successMessage);
				onsuccess?.(result.data);
				await update({ reset: false });
			} else if (result.type === 'failure') {
				errors = (result.data?.errors as Record<string, string>) ?? {};
				message = String(result.data?.message ?? 'Please check the form.');
				toasts.push(message, 'error');
				// Move focus to the first invalid field for keyboard/screen-reader users.
				queueMicrotask(() => {
					const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
					first?.focus();
				});
			} else if (result.type === 'redirect') {
				toasts.push(successMessage);
				await update();
			} else if (result.type === 'error') {
				message = result.error?.message ?? 'Something went wrong.';
				toasts.push(message, 'error');
			}
		};
	}}
>
	<input type="hidden" name="payload" value={JSON.stringify(payload)} />
	{#if message}
		<div role="alert" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			{message}
		</div>
	{/if}
	{@render children()}
	{#if !bare}
		<div
			class="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
		>
			{#if actions}{@render actions({ submitting })}{/if}
			<button type="submit" class="btn-primary" disabled={submitting}>
				{submitting ? 'Saving…' : submitLabel}
			</button>
		</div>
	{/if}
</form>
