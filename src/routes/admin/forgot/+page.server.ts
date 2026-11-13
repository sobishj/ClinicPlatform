import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users, passwordResets } from '#lib/server/db/schema.js';
import { randomToken, sha256Hex } from '#lib/server/crypto.js';
import { getEmailProvider, background } from '#lib/server/platform.js';
import { rateLimit, clientIp } from '#lib/server/rate-limit.js';
import { layout, button, esc } from '#lib/server/email/templates.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const provider = await getEmailProvider(locals.settings);
	return { title: 'Reset password', emailEnabled: !!provider };
};

export const actions: Actions = {
	default: async ({ request, locals, url, platform, getClientAddress }) => {
		const form = await request.formData();
		const email = z.string().trim().toLowerCase().email().safeParse(form.get('email'));
		if (!email.success) return fail(400, { message: 'Enter a valid email address.' });
		const limit = await rateLimit(locals.db, `reset:${clientIp(request, getClientAddress)}`, 5, 3600);
		if (!limit.allowed) return fail(429, { message: 'Too many requests. Please try again later.' });

		const provider = await getEmailProvider(locals.settings);
		const user = await locals.db.select().from(users).where(eq(users.email, email.data)).get();
		if (user && user.active && provider) {
			const token = randomToken(32);
			await locals.db.insert(passwordResets).values({
				tokenHash: await sha256Hex(token),
				userId: user.id,
				expiresAt: Date.now() + 60 * 60 * 1000
			});
			const link = `${url.origin}/admin/reset/${token}`;
			const s = locals.settings;
			background(
				platform,
				provider.send({
					to: user.email,
					subject: `Reset your ${s.clinic.name} admin password`,
					html: layout(
						s,
						'Reset your password',
						`<p>Hello ${esc(user.name)},</p><p>Someone asked to reset the password for your admin account. If this was you, use the button below within one hour.</p>${button(link, 'Choose a new password', s.theme.primary)}<p style="font-size:13px;color:#6b7280">If you did not ask for this, you can ignore this email.</p>`
					),
					text: `Reset your password: ${link}`
				})
			);
		}
		// Same response whether or not the account exists.
		return { sent: true };
	}
};
