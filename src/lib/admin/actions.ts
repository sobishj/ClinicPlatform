import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { toasts } from './toast.svelte.js';

/**
 * Call a SvelteKit form action from code (reorder, toggle, delete…).
 * `fields` become form fields; objects are sent as JSON in `payload`.
 */
export async function callAction(
	action: string,
	fields: Record<string, string> | { payload: unknown },
	opts: { success?: string; invalidate?: boolean } = {}
): Promise<boolean> {
	const fd = new FormData();
	if ('payload' in fields) fd.set('payload', JSON.stringify(fields.payload));
	else for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	const res = await fetch(action, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
	const result = deserialize(await res.text());
	if (result.type === 'success' || result.type === 'redirect') {
		if (opts.success) toasts.push(opts.success);
		if (opts.invalidate !== false) await invalidateAll();
		return true;
	}
	const message =
		result.type === 'failure'
			? String((result.data as { message?: string } | undefined)?.message ?? 'Could not save')
			: result.type === 'error'
				? (result.error?.message ?? 'Something went wrong')
				: 'Something went wrong';
	toasts.push(message, 'error');
	return false;
}
