/**
 * Console (super-admin) accounts and sessions. Separate from client logins: they live in the
 * platform database and use their own host-only cookie on the console host.
 */
import { error, redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { and, eq, gt, lt } from 'drizzle-orm';
import { dev } from '$app/env';
import type { PlatformDB } from '../platform-db/index.js';
import { platformSessions, platformUsers } from '../platform-db/schema.js';
import { randomToken, sha256Hex } from '../crypto.js';

export const CONSOLE_COOKIE = 'console_session';
const SESSION_HOURS = 12;

export interface ConsoleUser {
	id: string;
	email: string;
	name: string;
}

export async function createConsoleSession(pdb: PlatformDB, cookies: Cookies, userId: string) {
	const token = randomToken(32);
	const expiresAt = Date.now() + SESSION_HOURS * 3600_000;
	await pdb.insert(platformSessions).values({ id: await sha256Hex(token), userId, expiresAt });
	await pdb
		.update(platformUsers)
		.set({ lastLoginAt: Date.now() })
		.where(eq(platformUsers.id, userId));
	await pdb.delete(platformSessions).where(lt(platformSessions.expiresAt, Date.now()));
	cookies.set(CONSOLE_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		expires: new Date(expiresAt)
	});
}

export async function validateConsoleSession(
	pdb: PlatformDB,
	cookies: Cookies
): Promise<ConsoleUser | null> {
	const token = cookies.get(CONSOLE_COOKIE);
	if (!token) return null;
	const row = await pdb
		.select({
			id: platformUsers.id,
			email: platformUsers.email,
			name: platformUsers.name,
			active: platformUsers.active
		})
		.from(platformSessions)
		.innerJoin(platformUsers, eq(platformUsers.id, platformSessions.userId))
		.where(
			and(
				eq(platformSessions.id, await sha256Hex(token)),
				gt(platformSessions.expiresAt, Date.now())
			)
		)
		.get();
	if (!row?.active) {
		cookies.delete(CONSOLE_COOKIE, { path: '/' });
		return null;
	}
	return { id: row.id, email: row.email, name: row.name };
}

export async function destroyConsoleSession(pdb: PlatformDB, cookies: Cookies) {
	const token = cookies.get(CONSOLE_COOKIE);
	if (token)
		await pdb.delete(platformSessions).where(eq(platformSessions.id, await sha256Hex(token)));
	cookies.delete(CONSOLE_COOKIE, { path: '/' });
}

/** Server-side guard for every console load/action. */
export function requireConsoleUser(event: Pick<RequestEvent, 'locals' | 'url'>): ConsoleUser {
	const user = event.locals.consoleUser;
	if (!user)
		redirect(
			303,
			`/console/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`
		);
	return user;
}

export function consolePdb(event: Pick<RequestEvent, 'locals'>): PlatformDB {
	const pdb = event.locals.platformDb;
	if (!pdb) error(404, 'Not found');
	return pdb;
}
