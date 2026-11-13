import { describe, it, expect } from 'vitest';
import { can, canAccessLocation, locationScope, assignableRoles, type Permission } from './permissions.js';
import type { Role } from './types.js';

const user = (role: Role, locationIds: string[] = []) => ({ role, locationIds });

describe('can()', () => {
	const cases: Array<[Role, Permission, boolean]> = [
		['super_admin', 'settings:manage', true],
		['super_admin', 'users:manage', true],
		['super_admin', 'integrations:manage', true],
		['clinic_admin', 'settings:manage', false],
		['clinic_admin', 'users:manage', false],
		['clinic_admin', 'integrations:manage', false],
		['clinic_admin', 'content:write', true],
		['clinic_admin', 'branding:manage', true],
		['super_admin', 'branding:manage', true],
		['branch_staff', 'branding:manage', false],
		['clinic_admin', 'appointments:export', true],
		['branch_staff', 'content:read', true],
		['branch_staff', 'content:write', false],
		['branch_staff', 'media:write', false],
		['branch_staff', 'appointments:read', true],
		['branch_staff', 'appointments:write', true],
		['branch_staff', 'appointments:export', false],
		['branch_staff', 'audit:read', false]
	];
	it.each(cases)('%s → %s = %s', (role, perm, expected) => {
		expect(can(user(role), perm)).toBe(expected);
	});

	it('denies anonymous users everything', () => {
		expect(can(null, 'content:read')).toBe(false);
		expect(can(undefined, 'appointments:read')).toBe(false);
	});
});

describe('location access', () => {
	it('admins see every location', () => {
		expect(canAccessLocation(user('super_admin'), 'loc-1')).toBe(true);
		expect(canAccessLocation(user('clinic_admin'), 'loc-1')).toBe(true);
		expect(locationScope(user('clinic_admin'))).toBeNull();
	});

	it('branch staff see only assigned locations', () => {
		const staff = user('branch_staff', ['loc-1', 'loc-2']);
		expect(canAccessLocation(staff, 'loc-1')).toBe(true);
		expect(canAccessLocation(staff, 'loc-3')).toBe(false);
		expect(canAccessLocation(staff, null)).toBe(false);
		expect(locationScope(staff)).toEqual(['loc-1', 'loc-2']);
	});

	it('branch staff with no locations see nothing', () => {
		expect(locationScope(user('branch_staff'))).toEqual([]);
		expect(canAccessLocation(user('branch_staff'), 'loc-1')).toBe(false);
	});

	it('only super admins can assign roles', () => {
		expect(assignableRoles(user('super_admin'))).toContain('super_admin');
		expect(assignableRoles(user('clinic_admin'))).toEqual([]);
	});
});
