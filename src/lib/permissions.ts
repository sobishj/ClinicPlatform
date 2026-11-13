/**
 * Role-based permissions. Used on the server for every admin route and API call,
 * and in the UI only to hide controls (the UI is never trusted).
 */
import type { Role, SessionUser } from './types.js';

export type Permission =
	| 'settings:manage'
	| 'users:manage'
	| 'integrations:manage'
	| 'audit:read'
	| 'content:read'
	| 'content:write'
	| 'media:write'
	| 'appointments:read'
	| 'appointments:write'
	| 'appointments:export';

const MATRIX: Record<Role, Permission[]> = {
	super_admin: [
		'settings:manage',
		'users:manage',
		'integrations:manage',
		'audit:read',
		'content:read',
		'content:write',
		'media:write',
		'appointments:read',
		'appointments:write',
		'appointments:export'
	],
	clinic_admin: [
		'audit:read',
		'content:read',
		'content:write',
		'media:write',
		'appointments:read',
		'appointments:write',
		'appointments:export'
	],
	branch_staff: ['content:read', 'appointments:read', 'appointments:write']
};

export function can(user: Pick<SessionUser, 'role'> | null | undefined, permission: Permission): boolean {
	if (!user) return false;
	return MATRIX[user.role]?.includes(permission) ?? false;
}

/** Whether the user sees every location's appointments (true) or only assigned ones. */
export function hasAllLocations(user: Pick<SessionUser, 'role'>): boolean {
	return user.role === 'super_admin' || user.role === 'clinic_admin';
}

/** Can this user see/act on data for the given location? */
export function canAccessLocation(
	user: Pick<SessionUser, 'role' | 'locationIds'> | null | undefined,
	locationId: string | null | undefined
): boolean {
	if (!user) return false;
	if (hasAllLocations(user)) return true;
	if (!locationId) return false;
	return user.locationIds.includes(locationId);
}

/**
 * Location filter for appointment queries: `null` means no restriction,
 * an array means "only these" (possibly empty → nothing).
 */
export function locationScope(user: Pick<SessionUser, 'role' | 'locationIds'>): string[] | null {
	return hasAllLocations(user) ? null : [...user.locationIds];
}

/** Roles a user is allowed to assign to others. */
export function assignableRoles(user: Pick<SessionUser, 'role'>): Role[] {
	return user.role === 'super_admin' ? ['super_admin', 'clinic_admin', 'branch_staff'] : [];
}
