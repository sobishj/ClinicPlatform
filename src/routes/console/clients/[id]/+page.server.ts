import { error, fail, redirect } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { tenants, domains, ssoTokens, platformAudit } from '#lib/server/platform-db/schema.js';
import { users } from '#lib/server/db/schema.js';
import { requireConsoleUser, consolePdb } from '#lib/server/console/auth.js';
import { CONSOLE_HOST } from '#lib/server/console/host.js';
import { getTenantDb } from '#lib/server/platform.js';
import {
	addDomain,
	removeDomain,
	setPrimaryDomain,
	deleteClient,
	ProvisionError
} from '#lib/server/tenancy/provision.js';
import { invalidateHostCache } from '#lib/server/tenancy/hosts.js';
import { upsertClientUser } from '#lib/server/tenancy/seed.js';
import { randomToken, sha256Hex } from '#lib/server/crypto.js';
import { getTemplate, templatesByCategory } from '#lib/templates/registry.js';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function loadTenant(event: RequestEvent) {
	const t = await consolePdb(event)
		.select()
		.from(tenants)
		.where(eq(tenants.id, event.params.id))
		.get();
	if (!t) error(404, 'Client not found');
	return t;
}

const fromError = (err: unknown, form: string) => {
	if (err instanceof ProvisionError) return fail(400, { form, message: err.message });
	throw err;
};

export const load: PageServerLoad = async (event) => {
	requireConsoleUser(event);
	const pdb = consolePdb(event);
	const t = await loadTenant(event);
	const [hosts, log] = await Promise.all([
		pdb
			.select()
			.from(domains)
			.where(eq(domains.tenantId, t.id))
			.orderBy(desc(domains.isPrimary), asc(domains.hostname)),
		pdb
			.select()
			.from(platformAudit)
			.where(eq(platformAudit.tenantId, t.id))
			.orderBy(desc(platformAudit.createdAt))
			.limit(20)
	]);
	let clientUsers: Array<{
		id: string;
		email: string;
		name: string;
		role: string;
		active: boolean;
		lastLoginAt: number | null;
	}> = [];
	let dbError: string | null = null;
	try {
		const db = await getTenantDb(event.platform, t.dbRef);
		clientUsers = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				role: users.role,
				active: users.active,
				lastLoginAt: users.lastLoginAt
			})
			.from(users)
			.orderBy(asc(users.email));
	} catch (err) {
		console.error('[console] client database unavailable', err);
		dbError = 'The client’s database could not be opened.';
	}
	return {
		title: t.name,
		client: {
			...t,
			templateName: getTemplate(t.templateKey)?.name ?? `${t.templateKey} (missing)`
		},
		domains: hosts,
		users: clientUsers,
		dbError,
		log,
		categories: templatesByCategory(),
		created: event.url.searchParams.has('created')
	};
};

const detailsSchema = z.object({
	name: z.string().trim().min(2, 'Enter the client name').max(120),
	status: z.enum(['active', 'suspended']),
	templateKey: z.string().min(1),
	notes: z.string().max(2000).default('')
});

const adminSchema = z.object({
	email: z.string().trim().toLowerCase().email('Enter a valid email address'),
	name: z.string().trim().max(100).default(''),
	password: z.string().min(10, 'Use at least 10 characters').max(200),
	role: z.enum(['clinic_admin', 'branch_staff'])
});

async function log(event: RequestEvent, action: string, summary: string) {
	await consolePdb(event)
		.insert(platformAudit)
		.values({
			userEmail: event.locals.consoleUser?.email ?? null,
			action,
			tenantId: event.params.id,
			summary
		});
}

export const actions: Actions = {
	details: async (event) => {
		requireConsoleUser(event);
		const t = await loadTenant(event);
		const parsed = detailsSchema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success)
			return fail(400, { form: 'details', message: parsed.error.issues[0].message });
		if (!getTemplate(parsed.data.templateKey))
			return fail(400, { form: 'details', message: 'Choose a template.' });
		await consolePdb(event)
			.update(tenants)
			.set({
				name: parsed.data.name,
				status: parsed.data.status,
				templateKey: parsed.data.templateKey,
				notes: parsed.data.notes || null
			})
			.where(eq(tenants.id, t.id));
		invalidateHostCache();
		const changes = [
			t.status !== parsed.data.status
				? parsed.data.status === 'active'
					? 'reactivated'
					: 'suspended'
				: null,
			t.templateKey !== parsed.data.templateKey ? `template → ${parsed.data.templateKey}` : null
		].filter(Boolean);
		await log(event, 'update', `Details saved${changes.length ? ` (${changes.join(', ')})` : ''}`);
		return { form: 'details', ok: 'Saved.' };
	},

	addDomain: async (event) => {
		requireConsoleUser(event);
		const t = await loadTenant(event);
		const form = await event.request.formData();
		try {
			const host = await addDomain(
				consolePdb(event),
				t.id,
				String(form.get('hostname') ?? ''),
				CONSOLE_HOST,
				form.get('primary') === 'on'
			);
			await log(event, 'domain', `Added ${host}`);
			return { form: 'domains', ok: `${host} added.` };
		} catch (err) {
			return fromError(err, 'domains');
		}
	},

	primaryDomain: async (event) => {
		requireConsoleUser(event);
		const t = await loadTenant(event);
		try {
			await setPrimaryDomain(
				consolePdb(event),
				t.id,
				String((await event.request.formData()).get('id'))
			);
			await log(event, 'domain', 'Primary address changed');
			return { form: 'domains', ok: 'Main address changed.' };
		} catch (err) {
			return fromError(err, 'domains');
		}
	},

	removeDomain: async (event) => {
		requireConsoleUser(event);
		const t = await loadTenant(event);
		try {
			await removeDomain(
				consolePdb(event),
				t.id,
				String((await event.request.formData()).get('id'))
			);
			await log(event, 'domain', 'Address removed');
			return { form: 'domains', ok: 'Address removed.' };
		} catch (err) {
			return fromError(err, 'domains');
		}
	},

	saveUser: async (event) => {
		requireConsoleUser(event);
		const t = await loadTenant(event);
		const parsed = adminSchema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success)
			return fail(400, { form: 'users', message: parsed.error.issues[0].message });
		const db = await getTenantDb(event.platform, t.dbRef);
		await upsertClientUser(db, { ...parsed.data, name: parsed.data.name || parsed.data.email });
		await log(event, 'user', `Login saved for ${parsed.data.email}`);
		return {
			form: 'users',
			ok: `Login saved for ${parsed.data.email}. Existing sessions stay signed in until they expire.`
		};
	},

	/** Sign in to the client's /admin on the client's own address (one-time token, 60 seconds). */
	openAdmin: async (event) => {
		const user = requireConsoleUser(event);
		const t = await loadTenant(event);
		const pdb = consolePdb(event);
		const primary = await pdb
			.select()
			.from(domains)
			.where(eq(domains.tenantId, t.id))
			.orderBy(desc(domains.isPrimary))
			.get();
		if (!primary) return fail(400, { form: 'open', message: 'Add a web address first.' });
		if (t.status !== 'active')
			return fail(400, { form: 'open', message: 'Reactivate the client first.' });
		const token = randomToken(32);
		await pdb
			.insert(ssoTokens)
			.values({
				tokenHash: await sha256Hex(token),
				tenantId: t.id,
				userId: user.id,
				expiresAt: Date.now() + 60_000
			});
		await log(event, 'sso', `${user.email} opened the site admin`);
		const port = event.url.port ? `:${event.url.port}` : '';
		// Returned (not redirected): the console's CSP only allows forms to post to itself.
		return {
			form: 'open',
			ssoUrl: `${event.url.protocol}//${primary.hostname}${port}/admin/sso?token=${token}`
		};
	},

	delete: async (event) => {
		const user = requireConsoleUser(event);
		const t = await loadTenant(event);
		const confirm = String((await event.request.formData()).get('confirm') ?? '').trim();
		if (confirm !== t.slug)
			return fail(400, { form: 'delete', message: `Type ${t.slug} to confirm.` });
		await deleteClient(event.platform, consolePdb(event), t.id, user.email);
		redirect(303, '/console');
	}
};
