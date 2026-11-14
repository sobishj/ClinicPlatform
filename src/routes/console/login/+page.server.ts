import { fail, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { platformUsers, platformAudit } from '#lib/server/platform-db/schema.js';
import { verifyPassword } from '#lib/server/crypto.js';
import { createConsoleSession, consolePdb } from '#lib/server/console/auth.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	email: z.string().trim().toLowerCase().email('Enter a valid email address'),
	password: z.string().min(1, 'Enter your password')
});

const safeNext = (next: string | null) =>
	next && next.startsWith('/console') && !next.startsWith('//') ? next : '/console';

export const load: PageServerLoad = async (event) => {
	if (event.locals.consoleUser) redirect(303, safeNext(event.url.searchParams.get('next')));
	const count = await consolePdb(event).get<{ n: number }>(
		sql`SELECT COUNT(*) AS n FROM platform_users`
	);
	if (!Number(count?.n)) redirect(303, '/console/setup');
	return { title: 'Sign in' };
};

export const actions: Actions = {
	default: async (event) => {
		const pdb = consolePdb(event);
		const form = Object.fromEntries(await event.request.formData());
		const email = String(form.email ?? '');
		const parsed = schema.safeParse(form);
		if (!parsed.success) return fail(400, { email, message: parsed.error.issues[0].message });

		const ip = clientIp(event.request, event.getClientAddress);
		const [byIp, byEmail] = await Promise.all([
			rateLimit(pdb as never, `console:ip:${ip}`, 20, 15 * 60),
			rateLimit(pdb as never, `console:email:${parsed.data.email}`, 8, 15 * 60)
		]);
		if (!byIp.allowed || !byEmail.allowed)
			return fail(429, {
				email,
				message: 'Too many attempts. Please wait 15 minutes and try again.'
			});

		const user = await pdb
			.select()
			.from(platformUsers)
			.where(eq(platformUsers.email, parsed.data.email))
			.get();
		const ok = user
			? await verifyPassword(parsed.data.password, user.passwordHash)
			: await verifyPassword(
					parsed.data.password,
					'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
				);
		if (!user || !ok || !user.active)
			return fail(400, { email, message: 'Email or password is incorrect.' });
		await createConsoleSession(pdb, event.cookies, user.id);
		await pdb.insert(platformAudit).values({ userEmail: user.email, action: 'login' });
		redirect(303, safeNext(event.url.searchParams.get('next')));
	}
};
