import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers.js';

/** Every console page, section and setting explains itself through an ⓘ button. */
const at = (path: string) => `http://console.localhost:4173${path}`;

test('console ⓘ buttons explain each setting on hover and focus', async ({ page }) => {
	await page.goto(at('/console/login'));
	await page.getByLabel('Email').fill(ADMIN.email);
	await page.getByLabel('Password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/console$/);

	await expect(page.getByRole('button', { name: 'About “Clients”' })).toBeVisible();

	await page.goto(at('/console/clients/new'));
	for (const name of ['Add client', 'Clinic name', 'Handle', 'Template', 'Client URLs', 'Client admin login', 'Demo appointment requests'])
		await expect(page.getByRole('button', { name: `About “${name}”` })).toBeVisible();

	// Hover shows the explanation; Escape hides it.
	await page.getByRole('button', { name: 'About “Client URLs”' }).hover();
	const tip = page.getByRole('tooltip').filter({ hasText: 'recognise which clinic' });
	await expect(tip).toBeVisible();
	await page.screenshot({ path: 'test-results/console-help-new.png' });
	await page.keyboard.press('Escape');
	await expect(tip).toBeHidden();

	await page.goto(at('/console'));
	await page.getByRole('link', { name: /Orchid/ }).first().click();
	for (const name of ['Client', 'Web addresses', 'Main address', 'Details', 'Clinic name', 'Template', 'Status', 'Notes', 'Client logins', 'Console activity', 'Delete client'])
		await expect(page.getByRole('button', { name: `About “${name}”`, exact: true })).toBeVisible();

	// Keyboard focus shows it too.
	await page.getByRole('button', { name: 'About “Main address”' }).focus();
	await expect(page.getByRole('tooltip').filter({ hasText: 'official address' })).toBeVisible();
	await page.screenshot({ path: 'test-results/console-help-client.png' });
});
