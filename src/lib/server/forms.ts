import { fail, type ActionFailure } from '@sveltejs/kit';
import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

export function zodErrors(error: z.ZodError): FieldErrors {
	const out: FieldErrors = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || '_form';
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}

export type ParseResult<T> =
	| { ok: true; data: T }
	| { ok: false; failure: ActionFailure<{ errors: FieldErrors; message: string }> };

/**
 * Admin forms post their state as JSON in a hidden `payload` field (see AdminForm.svelte).
 * Validates with the given Zod schema; returns a ready-to-return `fail()` on error.
 */
export async function parsePayload<S extends z.ZodType>(
	request: Request,
	schema: S
): Promise<ParseResult<z.output<S>> & { form?: FormData }> {
	const form = await request.formData();
	let raw: unknown;
	try {
		raw = JSON.parse(String(form.get('payload') ?? '{}'));
	} catch {
		return { ok: false, failure: fail(400, { errors: {}, message: 'Invalid form data.' }) };
	}
	const result = schema.safeParse(raw);
	if (!result.success) {
		const errors = zodErrors(result.error);
		return {
			ok: false,
			failure: fail(400, { errors, message: 'Please correct the highlighted fields.' })
		};
	}
	return { ok: true, data: result.data, form };
}

/** Parse a plain (non-JSON) form into an object for public forms. */
export function formToObject(form: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
	return out;
}

export function failMessage(message: string, status = 400) {
	return fail(status, { errors: {} as FieldErrors, message });
}
