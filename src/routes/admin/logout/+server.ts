import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth.js';
import { audit } from '#lib/server/audit.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (event.locals.user) await audit(event, 'logout', 'user', event.locals.user.id, event.locals.user.email);
	await destroySession(event.locals.db, event.cookies, event.locals.sessionId);
	redirect(303, '/admin/login');
};
