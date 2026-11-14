import { redirect } from '@sveltejs/kit';
import { destroyConsoleSession, consolePdb } from '#lib/server/console/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await destroyConsoleSession(consolePdb(event), event.cookies);
	redirect(303, '/console/login');
};
