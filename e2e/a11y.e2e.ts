import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Automated WCAG 2.1 A/AA checks on the key public pages (serious and critical issues fail). */
const pages = ['/', '/services', '/services/root-canal-treatment', '/doctors', '/doctors/anjali-menon', '/locations', '/locations/kakkanad', '/book', '/contact', '/about', '/admin/login'];

for (const path of pages) {
	test(`accessibility: ${path}`, async ({ page }) => {
		await page.goto(path);
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			// Third-party map iframes are outside our control.
			.exclude('iframe')
			.analyze();
		const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
		expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')})`)).toEqual([]);
	});
}

test('skip link moves focus to the main content', async ({ page }) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	await expect(skip).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#main$/);
});
