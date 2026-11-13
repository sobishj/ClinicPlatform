import { fail } from '@sveltejs/kit';
import { loadGroups, saveGroups } from '#lib/server/settings-page.js';
import { requirePermission } from '#lib/server/auth.js';
import { getEmailProvider, TARGET } from '#lib/server/platform.js';
import { layout } from '#lib/server/email/templates.js';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['notifications', 'email'] as const;

export const load: PageServerLoad = async (event) => ({
	title: 'Notifications & email',
	target: TARGET,
	...loadGroups(event, [...KEYS])
});

export const actions: Actions = {
	save: (event) => saveGroups(event, [...KEYS]),
	test: async (event) => {
		const user = requirePermission(event, 'settings:manage');
		const provider = await getEmailProvider(event.locals.settings);
		if (!provider) return fail(400, { errors: {}, message: 'No email provider is configured (save your settings first).' });
		try {
			await provider.send({
				to: user.email,
				subject: 'Test email from your clinic website',
				html: layout(event.locals.settings, 'It works!', '<p>Your website can send email. Appointment notifications will arrive like this.</p>')
			});
			return { ok: true, message: `Test email sent to ${user.email}` };
		} catch (err) {
			return fail(400, { errors: {}, message: `Sending failed: ${err instanceof Error ? err.message : String(err)}` });
		}
	}
};
