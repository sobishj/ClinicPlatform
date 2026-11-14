import { error, redirect } from '@sveltejs/kit';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { ssoTokens, platformUsers } from '#lib/server/platform-db/schema.js';
import { users } from '#lib/server/db/schema.js';
import { sha256Hex, randomToken, hashPassword } from '#lib/server/crypto.js';
import { createSession } from '#lib/server/auth.js';
import { audit } from '#lib/server/audit.js';
import type { RequestHandler } from './$types';

/**
 * One-time sign-in from the console ("Open site admin"). The token is issued by the console,
 * valid for 60 seconds, usable once, and only on the client it was issued for. The console
 * user gets (or reuses) a super-admin login in this client's database.
 */
export const GET: RequestHandler = async (event) => {
	const { locals, url, cookies, request } = event;
	const token = url.searchParams.get('token') ?? '';
	if (!locals.tenant || !/^[A-Za-z0-9_-]{20,}$/.test(token)) error(404, 'Not found');
	const pdb = locals.platformDb;
	const tokenHash = await sha256Hex(token);
	const row = await pdb
		.select({
			userId: ssoTokens.userId,
			email: platformUsers.email,
			name: platformUsers.name,
			active: platformUsers.active
		})
		.from(ssoTokens)
		.innerJoin(platformUsers, eq(platformUsers.id, ssoTokens.userId))
		.where(
			and(
				eq(ssoTokens.tokenHash, tokenHash),
				eq(ssoTokens.tenantId, locals.tenant.id),
				gt(ssoTokens.expiresAt, Date.now()),
				isNull(ssoTokens.usedAt)
			)
		)
		.get();
	if (!row?.active)
		error(403, 'This sign-in link has expired. Open the site admin from the console again.');
	await pdb.update(ssoTokens).set({ usedAt: Date.now() }).where(eq(ssoTokens.tokenHash, tokenHash));

	const db = locals.db;
	let user = await db.select().from(users).where(eq(users.email, row.email)).get();
	if (!user) {
		const id = crypto.randomUUID();
		// No usable password: this login only works through the console.
		await db
			.insert(users)
			.values({
				id,
				email: row.email,
				name: row.name,
				role: 'super_admin',
				passwordHash: await hashPassword(randomToken(32))
			});
		user = await db.select().from(users).where(eq(users.id, id)).get();
	} else if (user.role !== 'super_admin' || !user.active) {
		await db.update(users).set({ role: 'super_admin', active: true }).where(eq(users.id, user.id));
	}
	if (!user) error(500, 'Sign-in failed');
	await createSession(db, cookies, user.id, request.headers.get('user-agent'));
	locals.user = {
		id: user.id,
		email: user.email,
		name: user.name,
		role: 'super_admin',
		locationIds: []
	};
	await audit(event, 'login', 'user', user.id, `${user.email} (from console)`);
	redirect(303, '/admin');
};
