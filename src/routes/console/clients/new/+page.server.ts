import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireConsoleUser, consolePdb } from '#lib/server/console/auth.js';
import { CONSOLE_HOST } from '#lib/server/console/host.js';
import { createClient, freeSlots, ProvisionError } from '#lib/server/tenancy/provision.js';
import { templatesByCategory, DEFAULT_TEMPLATE } from '#lib/templates/registry.js';
import type { Actions, PageServerLoad } from './$types';

const schema = z
	.object({
		name: z.string().trim().min(2, 'Enter the client name').max(120),
		slug: z.string().trim().max(60).optional(),
		templateKey: z.string().min(1, 'Choose a template'),
		domains: z.string().max(2000).default(''),
		adminEmail: z
			.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid admin email')])
			.default(''),
		adminName: z.string().trim().max(100).default(''),
		adminPassword: z.string().max(200).default(''),
		slot: z.string().optional(),
		wipeSlot: z.literal('on').optional(),
		demoAppointments: z.literal('on').optional()
	})
	.refine((v) => !v.adminEmail || v.adminPassword.length >= 10, {
		message: 'The admin password needs at least 10 characters',
		path: ['adminPassword']
	});

export const load: PageServerLoad = async (event) => {
	requireConsoleUser(event);
	return {
		title: 'Add client',
		categories: templatesByCategory(),
		defaultTemplate: DEFAULT_TEMPLATE,
		slots: await freeSlots(event.platform, consolePdb(event))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireConsoleUser(event);
		const pdb = consolePdb(event);
		const form = Object.fromEntries(await event.request.formData());
		const values = { ...form, adminPassword: '' };
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return fail(400, { values, field: String(issue.path[0] ?? ''), message: issue.message });
		}
		const v = parsed.data;
		let result;
		try {
			result = await createClient(
				event.platform,
				pdb,
				{
					name: v.name,
					slug: v.slug,
					templateKey: v.templateKey,
					domains: v.domains.split(/[\s,]+/),
					admin: v.adminEmail
						? { email: v.adminEmail, name: v.adminName || v.adminEmail, password: v.adminPassword }
						: undefined,
					slot: v.slot || undefined,
					wipeSlot: !!v.wipeSlot,
					demoAppointments: !!v.demoAppointments
				},
				{ consoleHost: CONSOLE_HOST, actor: user.email }
			);
		} catch (err) {
			if (err instanceof ProvisionError)
				return fail(400, { values, field: err.field ?? '', message: err.message });
			console.error('[console] add client failed', err);
			return fail(500, {
				values,
				field: '',
				message:
					'The client could not be created. Nothing was saved. See the server log for details.'
			});
		}
		redirect(303, `/console/clients/${result.tenantId}?created=1`);
	}
};
