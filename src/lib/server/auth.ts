import { error, redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { and, eq, gt, lt } from 'drizzle-orm';
import { dev } from '$app/env';
import type { DB } from './db/index.js';
import { sessions, users, userLocations } from './db/schema.js';
import { randomToken, sha256Hex } from './crypto.js';
import { can, canAccessLocation, type Permission } from '../permissions.js';
import type { SessionUser } from '../types.js';

export const SESSION_COOKIE = 'clinic_session';
const SESSION_DAYS = 14;
const RENEW_WHEN_LEFT_MS = 7 * 24 * 3600 * 1000;

export async function createSession(db: DB, cookies: Cookies, userId: string, userAgent?: string | null) {
	const token = randomToken(32);
	const id = await sha256Hex(token);
	const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
	await db.insert(sessions).values({ id, userId, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null });
	setSessionCookie(cookies, token, expiresAt);
	await db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, userId));
	// Housekeeping: drop expired sessions.
	await db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
}

function setSessionCookie(cookies: Cookies, token: string, expiresAt: number) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: new Date(expiresAt)
	});
}

export async function validateSession(
	db: DB,
	cookies: Cookies
): Promise<{ user: SessionUser; sessionId: string } | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const id = await sha256Hex(token);
	const row = await db
		.select({
			sessionId: sessions.id,
			expiresAt: sessions.expiresAt,
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			active: users.active
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, Date.now())))
		.get();
	if (!row || !row.active) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	// Sliding expiry.
	if (row.expiresAt - Date.now() < RENEW_WHEN_LEFT_MS) {
		const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
		setSessionCookie(cookies, token, expiresAt);
	}
	const locs =
		row.role === 'branch_staff'
			? await db
					.select({ locationId: userLocations.locationId })
					.from(userLocations)
					.where(eq(userLocations.userId, row.id))
			: [];
	return {
		sessionId: id,
		user: {
			id: row.id,
			email: row.email,
			name: row.name,
			role: row.role,
			locationIds: locs.map((l) => l.locationId)
		}
	};
}

export async function destroySession(db: DB, cookies: Cookies, sessionId: string | null) {
	if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function destroyUserSessions(db: DB, userId: string) {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Server-side guard. Use at the top of every admin load/action. */
export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>): SessionUser {
	const user = event.locals.user;
	if (!user) {
		const next = event.url.pathname + event.url.search;
		redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}
	return user;
}

export function requirePermission(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	permission: Permission
): SessionUser {
	const user = requireUser(event);
	if (!can(user, permission)) error(403, 'You do not have permission to do that.');
	return user;
}

export function requireLocationAccess(user: SessionUser, locationId: string | null | undefined) {
	if (!canAccessLocation(user, locationId))
		error(403, 'You do not have access to this location.');
}
