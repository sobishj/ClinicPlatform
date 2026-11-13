import { test, expect, type Page } from '@playwright/test';
import { withDb } from './helpers.js';

const stepHeading = (page: Page) => page.locator('h2[tabindex="-1"]');

async function chooseDayAndTime(page: Page) {
	await expect(stepHeading(page)).toHaveText('Choose a day and time');
	await page.locator('label:has(input[name=_date])').first().click();
	await page.locator('label:has(input[name=_win])').first().click();
	await page.getByRole('button', { name: 'Continue' }).click();
}

async function fillDetailsAndSend(page: Page, name: string) {
	await expect(stepHeading(page)).toHaveText('Your details');
	await page.getByLabel('Patient name').fill(name);
	await page.getByLabel('Mobile number').fill('98765 43210');
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Send request' }).click();
	await expect(page).toHaveURL(/\/book\/thanks\?ref=[A-Z]+-[A-Z0-9]{6}/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Thank you');
	return page.locator('dd.font-mono').innerText();
}

test.describe('visitor appointment request', () => {
	test.use({ viewport: { width: 390, height: 844 } }); // phone-sized

	test('with several locations: branch is the first step', async ({ page }) => {
		await page.goto('/book');
		await expect(stepHeading(page)).toHaveText('Choose a branch');
		await page.locator('label:has(input[name=_loc])', { hasText: 'Edappally' }).click();
		await expect(stepHeading(page)).toHaveText('Choose a doctor');
		await page.locator('label:has(input[name=_doc])', { hasText: 'No preference' }).click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await chooseDayAndTime(page);
		const ref = await fillDetailsAndSend(page, 'E2E Several');

		const row = withDb((db) => db.prepare('SELECT a.status, a.source, l.slug FROM appointments a JOIN locations l ON l.id = a.location_id WHERE reference = ?').get(ref)) as { status: string; source: string; slug: string };
		expect(row).toEqual({ status: 'new', source: 'web', slug: 'edappally' });
	});

	test('with one location: the branch step is skipped', async ({ page }) => {
		withDb((db) => db.prepare("UPDATE locations SET active = 0 WHERE slug <> 'kakkanad'").run());
		try {
			await page.goto('/book');
			await expect(stepHeading(page)).toHaveText('Choose a doctor');
			await page.getByRole('button', { name: 'Continue' }).click();
			await chooseDayAndTime(page);
			const ref = await fillDetailsAndSend(page, 'E2E Single');
			const row = withDb((db) => db.prepare('SELECT l.slug FROM appointments a JOIN locations l ON l.id = a.location_id WHERE reference = ?').get(ref)) as { slug: string };
			expect(row.slug).toBe('kakkanad');
		} finally {
			withDb((db) => db.prepare('UPDATE locations SET active = 1').run());
		}
	});

	test('pre-filled from a doctor profile', async ({ page }) => {
		await page.goto('/doctors/fathima-rasheed');
		await page.getByRole('link', { name: /Book with/ }).first().click();
		// Fathima works at one branch only: branch and doctor steps are both skipped.
		await chooseDayAndTime(page);
		await expect(page.getByLabel('Your choices')).toContainText('Fathima Rasheed');
	});

	test('shows validation errors for a bad phone number', async ({ page }) => {
		await page.goto('/book?location=edappally');
		await page.getByRole('button', { name: 'Continue' }).click();
		await chooseDayAndTime(page);
		await page.getByLabel('Patient name').fill('E2E Invalid');
		await page.getByLabel('Mobile number').fill('12345');
		await page.getByRole('checkbox').check();
		await page.getByRole('button', { name: 'Send request' }).click();
		await expect(page.getByText(/Please enter a valid mobile number/)).toBeVisible();
	});

	test.afterAll(() => withDb((db) => db.prepare("DELETE FROM appointments WHERE patient_name LIKE 'E2E%'").run()));
});
