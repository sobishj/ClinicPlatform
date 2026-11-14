import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { SETUP_TOKEN } from '$app/env/private';
import { platformUsers, platformAudit } from '#lib/server/platform-db/schema.js';
import { hashPassword, safeEqual } from '#lib/server/crypto.js';
import { createConsoleSession, consolePdb } from '#lib/server/console/auth.js';
import type { PlatformDB } from '#lib/server/platform-db/index.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	name: z.string().trim().min(2, 'Enter your name').max(100),
	email: z.string().trim().toLowerCase().email('Enter a valid email address'),
	password: z.string().min(10, 'Use at least 10 characters').max(200),
	token: z.string().optional()
});

async function hasUsers(pdb: PlatformDB) {
	const r = await pdb.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM platform_users`);
	return Number(r?.n ?? 0) > 0;
}

/** First run only: create the first console (super admin) account. */
export const load: PageServerLoad = async (event) => {
	if (await hasUsers(consolePdb(event))) redirect(303, '/console/login');
	return { title: 'Set up', needsToken: !!SETUP_TOKEN };
};

export const actions: Actions = {
	default: async (event) => {
		const pdb = consolePdb(event);
		if (await hasUsers(pdb)) redirect(303, '/console/login');
		const form = Object.fromEntries(await event.request.formData());
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { values: { name: form.name, email: form.email }, message: parsed.error.issues[0].message });
		}
		if (SETUP_TOKEN && !safeEqual(parsed.data.token ?? '', SETUP_TOKEN)) {
			return fail(403, { values: { name: form.name, email: form.email }, message: 'The setup token is not correct.' });
		}
		const id = crypto.randomUUID();
		await pdb.insert(platformUsers).values({
			id,
			email: parsed.data.email,
			name: parsed.data.name,
			passwordHash: await hashPassword(parsed.data.password)
		});
		await pdb.insert(platformAudit).values({ userEmail: parsed.data.email, action: 'setup', summary: 'First console account created' });
		await createConsoleSession(pdb, event.cookies, id);
		redirect(303, '/console');
	}
};
