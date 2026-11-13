import { fail, redirect } from '@sveltejs/kit';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { users, passwordResets } from '#lib/server/db/schema.js';
import { hashPassword, sha256Hex } from '#lib/server/crypto.js';
import { destroyUserSessions } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

async function findReset(db: App.Locals['db'], token: string) {
	return db
		.select()
		.from(passwordResets)
		.where(
			and(
				eq(passwordResets.tokenHash, await sha256Hex(token)),
				gt(passwordResets.expiresAt, Date.now()),
				isNull(passwordResets.usedAt)
			)
		)
		.get();
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const reset = await findReset(locals.db, params.token);
	return { title: 'Choose a new password', valid: !!reset };
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const reset = await findReset(locals.db, params.token);
		if (!reset) return fail(400, { message: 'This link has expired. Please request a new one.' });
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		if (password.length < 10) return fail(400, { message: 'Use at least 10 characters.' });
		if (password !== String(form.get('confirm') ?? '')) return fail(400, { message: 'The passwords do not match.' });
		await locals.db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, reset.userId));
		await locals.db.update(passwordResets).set({ usedAt: Date.now() }).where(eq(passwordResets.tokenHash, reset.tokenHash));
		await destroyUserSessions(locals.db, reset.userId);
		redirect(303, '/admin/login?reset=1');
	}
};
