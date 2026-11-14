import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '#lib/server/db/schema.js';
import { verifyPassword } from '#lib/server/crypto.js';
import { createSession } from '#lib/server/auth.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import { audit } from '#lib/server/audit.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	email: z.string().trim().toLowerCase().email('Enter a valid email address'),
	password: z.string().min(1, 'Enter your password')
});

function safeNext(next: string | null): string {
	return next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	// Client logins are created from the console; there is no self-service setup screen.
	return { title: 'Log in' };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals, cookies, url, getClientAddress } = event;
		const form = Object.fromEntries(await request.formData());
		const parsed = schema.safeParse(form);
		const email = String(form.email ?? '');
		if (!parsed.success) return fail(400, { email, message: parsed.error.issues[0].message });

		const ip = clientIp(request, getClientAddress);
		const [byIp, byEmail] = await Promise.all([
			rateLimit(locals.db, `login:ip:${ip}`, 20, 15 * 60),
			rateLimit(locals.db, `login:email:${parsed.data.email}`, 8, 15 * 60)
		]);
		if (!byIp.allowed || !byEmail.allowed) {
			return fail(429, {
				email,
				message: 'Too many attempts. Please wait 15 minutes and try again.'
			});
		}

		const user = await locals.db
			.select()
			.from(users)
			.where(eq(users.email, parsed.data.email))
			.get();
		// Always run a hash comparison to keep timing similar for unknown emails.
		const ok = user
			? await verifyPassword(parsed.data.password, user.passwordHash)
			: await verifyPassword(
					parsed.data.password,
					'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
				);
		if (!user || !ok || !user.active) {
			return fail(400, { email, message: 'Email or password is incorrect.' });
		}
		await createSession(locals.db, cookies, user.id, request.headers.get('user-agent'));
		locals.user = {
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			locationIds: []
		};
		await audit(event, 'login', 'user', user.id, user.email);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
