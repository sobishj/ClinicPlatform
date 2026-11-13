import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { users, sessions } from '#lib/server/db/schema.js';
import { requireUser } from '#lib/server/auth.js';
import { hashPassword, verifyPassword } from '#lib/server/crypto.js';
import { parsePayload } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	return { title: 'My account', me: { name: user.name, email: user.email } };
};

const schema = z.object({
	name: z.string().trim().min(2).max(100),
	currentPassword: z.string().default(''),
	newPassword: z.string().default('')
});

export const actions: Actions = {
	save: async (event) => {
		const me = requireUser(event);
		const parsed = await parsePayload(event.request, schema);
		if (!parsed.ok) return parsed.failure;
		const d = parsed.data;
		const db = event.locals.db;
		const row = await db.select().from(users).where(eq(users.id, me.id)).get();
		if (!row) return fail(404, { errors: {}, message: 'Account not found.' });
		const update: Partial<typeof users.$inferInsert> = { name: d.name };
		if (d.newPassword) {
			if (d.newPassword.length < 10) return fail(400, { errors: { newPassword: 'Use at least 10 characters' }, message: 'Password too short.' });
			if (!(await verifyPassword(d.currentPassword, row.passwordHash)))
				return fail(400, { errors: { currentPassword: 'Current password is incorrect' }, message: 'Current password is incorrect.' });
			update.passwordHash = await hashPassword(d.newPassword);
		}
		await db.update(users).set(update).where(eq(users.id, me.id));
		if (d.newPassword && event.locals.sessionId) {
			// Sign out other devices.
			await db.delete(sessions).where(and(eq(sessions.userId, me.id), ne(sessions.id, event.locals.sessionId)));
		}
		await audit(event, 'update', 'user', me.id, d.newPassword ? 'Changed own password' : 'Updated own profile');
		return { ok: true };
	}
};
