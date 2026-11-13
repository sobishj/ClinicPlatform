import { expect, type Page } from '@playwright/test';
import Database from 'better-sqlite3';

export const ADMIN = { email: 'e2e@example.com', password: 'E2E-password-123' };

export async function login(page: Page) {
	await page.goto('/admin/login');
	await page.getByLabel('Email').fill(ADMIN.email);
	await page.getByLabel('Password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/admin$/);
}

/** Direct access to the e2e database for test setup (and cache invalidation). */
export function withDb<T>(fn: (db: Database.Database) => T): T {
	const db = new Database('./data/e2e.db');
	db.pragma('busy_timeout = 5000');
	try {
		const out = fn(db);
		db.prepare("UPDATE settings SET value = ? WHERE key = '_contentVersion'").run(JSON.stringify(String(Date.now())));
		return out;
	} finally {
		db.close();
	}
}

/** Wait for the admin toast confirming an autosave/save. */
export async function expectToast(page: Page, text: string | RegExp) {
	await expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible();
}
