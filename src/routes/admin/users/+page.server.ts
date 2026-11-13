import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { users, userLocations, locations } from '#lib/server/db/schema.js';
import { requirePermission, destroyUserSessions } from '#lib/server/auth.js';
import { hashPassword, randomToken } from '#lib/server/crypto.js';
import { parsePayload, failMessage } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import { runBatch } from '#lib/server/db/index.js';
import type { Actions, PageServerLoad } from './$types';

const userSchema = z.object({
	id: z.string().optional(),
	name: z.string().trim().min(2, 'Enter a name').max(100),
	email: z.string().trim().toLowerCase().email('Enter a valid email'),
	role: z.enum(['super_admin', 'clinic_admin', 'branch_staff']),
	active: z.boolean().default(true),
	locationIds: z.array(z.string()).default([]),
	password: z.string().max(200).optional().default('')
});

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'users:manage');
	const db = event.locals.db;
	const [list, links, locs] = await Promise.all([
		db
			.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, lastLoginAt: users.lastLoginAt })
			.from(users)
			.orderBy(asc(users.name)),
		db.select().from(userLocations),
		db.select({ id: locations.id, name: locations.name }).from(locations).orderBy(asc(locations.sortOrder))
	]);
	return {
		title: 'Users',
		users: list.map((u) => ({ ...u, locationIds: links.filter((l) => l.userId === u.id).map((l) => l.locationId) })),
		locations: locs
	};
};

export const actions: Actions = {
	save: async (event) => {
		const me = requirePermission(event, 'users:manage');
		const parsed = await parsePayload(event.request, userSchema);
		if (!parsed.ok) return parsed.failure;
		const d = parsed.data;
		const db = event.locals.db;
		if (d.role === 'branch_staff' && d.locationIds.length === 0) {
			return fail(400, { errors: { locationIds: 'Choose at least one branch' }, message: 'Branch staff need at least one branch.' });
		}
		const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).get();
		if (clash && clash.id !== d.id) return fail(400, { errors: { email: 'This email is already used' }, message: 'This email is already used.' });

		let generated: string | null = null;
		let password = d.password;
		if (!d.id && !password) password = generated = randomToken(12);
		if (password && password.length < 10) return fail(400, { errors: { password: 'Use at least 10 characters' }, message: 'Password too short.' });

		const id = d.id ?? crypto.randomUUID();
		if (d.id) {
			if (d.id === me.id && (d.role !== 'super_admin' || !d.active)) {
				return failMessage('You cannot remove your own super-admin access.');
			}
			await db
				.update(users)
				.set({
					name: d.name,
					email: d.email,
					role: d.role,
					active: d.active,
					...(password ? { passwordHash: await hashPassword(password) } : {})
				})
				.where(eq(users.id, id));
			if (password || !d.active) await destroyUserSessions(db, id);
		} else {
			await db.insert(users).values({ id, name: d.name, email: d.email, role: d.role, active: d.active, passwordHash: await hashPassword(password) });
		}
		const locIds = d.role === 'branch_staff' ? d.locationIds : [];
		await runBatch(db, [
			db.delete(userLocations).where(eq(userLocations.userId, id)),
			...locIds.map((locationId) => db.insert(userLocations).values({ userId: id, locationId }))
		]);
		await audit(event, d.id ? 'update' : 'create', 'user', id, `${d.email} (${d.role})`);
		return { ok: true, generatedPassword: generated, email: d.email };
	},
	delete: async (event) => {
		const me = requirePermission(event, 'users:manage');
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		if (id === me.id) return failMessage('You cannot delete your own account.');
		const u = await event.locals.db.select().from(users).where(eq(users.id, id)).get();
		if (!u) return failMessage('User not found.', 404);
		await event.locals.db.delete(users).where(eq(users.id, id));
		await audit(event, 'delete', 'user', id, u.email);
		return { ok: true };
	}
};
