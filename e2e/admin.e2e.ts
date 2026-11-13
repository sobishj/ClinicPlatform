import { test, expect } from '@playwright/test';
import { withDb, expectToast } from './helpers.js';

test.describe('admin content management', () => {
	test('adds a hero slide and reorders it to the front', async ({ page }) => {
		await page.goto('/admin/slides');
		const rows = page.locator('[data-sortable] > li');
		const before = await rows.count();

		await page.getByRole('button', { name: 'Add slide' }).click();
		const slideDialog = page.getByRole('dialog', { name: 'Add slide' });
		await slideDialog.getByRole('button', { name: 'Choose image' }).first().click();
		const picker = page.getByRole('dialog', { name: 'Choose an image' });
		await picker.locator('ul li button').first().click();
		await slideDialog.getByLabel('Heading', { exact: true }).fill('E2E Slide');
		await slideDialog.getByRole('button', { name: 'Save slide' }).click();
		await expectToast(page, 'Saved');

		await expect(rows).toHaveCount(before + 1);
		await expect(rows.last()).toContainText('E2E Slide');

		// Move it to the top with the keyboard-accessible buttons (autosaves each time).
		for (let i = 0; i < before; i++) {
			await page.getByRole('button', { name: 'Move E2E Slide up' }).click();
			await expectToast(page, 'Order saved');
		}
		await page.reload();
		await expect(rows.first()).toContainText('E2E Slide');

		// The public homepage now opens with the new slide.
		await page.goto('/');
		await expect(page.locator('h1')).toHaveText('E2E Slide');
	});

	test('adds a location with a Google Map', async ({ page }) => {
		await page.goto('/admin/locations/new');
		await page.getByRole('textbox', { name: 'Name', exact: true }).fill('E2E Branch');
		await page.getByRole('textbox', { name: 'Address line 1', exact: true }).fill('12 Test Street');
		await page.getByRole('textbox', { name: 'City', exact: true }).fill('Kochi');
		await page
			.getByLabel('Google Maps link or embed code')
			.fill(
				'<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929!2d76.3!3d10.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
			);
		await page.getByRole('button', { name: 'Use this map' }).click();
		await expect(page.locator('iframe[title="Map preview"]')).toHaveAttribute('src', /google\.com\/maps\/embed\?pb=/);
		await expect(page.getByLabel('Latitude')).toHaveValue('10');

		await page.getByRole('button', { name: 'Create location' }).click();
		await expect(page).toHaveURL(/\/admin\/locations\/[0-9a-f-]+\?created=1/);

		await page.goto('/locations/e2e-branch');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E Branch');
		await expect(page.locator('iframe[title="Map of E2E Branch"]')).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\/embed\?pb=/);
	});

	test('rejects a map from another website', async ({ page }) => {
		await page.goto('/admin/locations/new');
		await page.getByLabel('Google Maps link or embed code').fill('<iframe src="https://evil.example.com/maps/embed?pb=1"></iframe>');
		await page.getByRole('button', { name: 'Use this map' }).click();
		await expect(page.getByText('Only Google Maps embed codes are allowed.')).toBeVisible();
		await expect(page.locator('iframe[title="Map preview"]')).toHaveCount(0);
	});

	test('adds a doctor to two branches and they appear on both location pages', async ({ page }) => {
		await page.goto('/admin/doctors/new');
		await page.getByLabel('Full name').fill('E2E Doctor');
		await page.getByLabel('Qualifications').fill('BDS');
		await page.getByRole('checkbox', { name: 'Kakkanad' }).check();
		await page.getByRole('checkbox', { name: 'Vyttila' }).check();
		await page.getByRole('button', { name: 'Create profile' }).click();
		await expect(page).toHaveURL(/\/admin\/doctors\/[0-9a-f-]+\?created=1/);

		for (const slug of ['kakkanad', 'vyttila']) {
			await page.goto(`/locations/${slug}`);
			await expect(page.getByRole('heading', { name: 'Dr. E2E Doctor' })).toBeVisible();
		}
		await page.goto('/locations/edappally');
		await expect(page.getByRole('heading', { name: 'Dr. E2E Doctor' })).toHaveCount(0);

		// And the profile lists both branches.
		await page.goto('/doctors/e2e-doctor');
		await expect(page.getByRole('heading', { name: 'Kakkanad', level: 3 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Vyttila', level: 3 })).toBeVisible();
	});

	test.afterAll(() => {
		withDb((db) => {
			db.prepare("DELETE FROM slides WHERE heading = 'E2E Slide'").run();
			db.prepare("DELETE FROM locations WHERE slug = 'e2e-branch'").run();
			db.prepare("DELETE FROM doctors WHERE slug = 'e2e-doctor'").run();
		});
	});
});
