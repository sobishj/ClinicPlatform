import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { SETUP_TOKEN } from '$app/env/private';
import { users } from '#lib/server/db/schema.js';
import { hashPassword, safeEqual } from '#lib/server/crypto.js';
import { createSession } from '#lib/server/auth.js';
import { audit } from '#lib/server/audit.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	name: z.string().trim().min(2, 'Enter your name').max(100),
	email: z.string().trim().toLowerCase().email('Enter a valid email address'),
	password: z.string().min(10, 'Use at least 10 characters').max(200),
	token: z.string().optional()
});

async function hasUsers(db: App.Locals['db']) {
	const r = await db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM users`);
	return (r?.n ?? 0) > 0;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (await hasUsers(locals.db)) redirect(303, '/admin/login');
	return { title: 'Set up', needsToken: !!SETUP_TOKEN };
};

export const actions: Actions = {
	default: async (event) => {
		const { locals, request, cookies } = event;
		if (await hasUsers(locals.db)) redirect(303, '/admin/login');
		const form = Object.fromEntries(await request.formData());
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { values: { name: form.name, email: form.email }, message: parsed.error.issues[0].message });
		}
		if (SETUP_TOKEN && !safeEqual(parsed.data.token ?? '', SETUP_TOKEN)) {
			return fail(403, { values: { name: form.name, email: form.email }, message: 'The setup token is not correct.' });
		}
		const id = crypto.randomUUID();
		await locals.db.insert(users).values({
			id,
			email: parsed.data.email,
			name: parsed.data.name,
			passwordHash: await hashPassword(parsed.data.password),
			role: 'super_admin'
		});
		await createSession(locals.db, cookies, id, request.headers.get('user-agent'));
		locals.user = { id, email: parsed.data.email, name: parsed.data.name, role: 'super_admin', locationIds: [] };
		await audit(event, 'create', 'user', id, 'Initial super admin created via setup screen');
		redirect(303, '/admin');
	}
};
