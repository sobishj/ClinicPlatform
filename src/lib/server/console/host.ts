import { PLATFORM_ADMIN_HOST } from '$app/env/private';

/** Host name of the console (super admin). Client sites never answer on it. */
export const CONSOLE_HOST = (PLATFORM_ADMIN_HOST ?? 'console.localhost').trim().toLowerCase();
