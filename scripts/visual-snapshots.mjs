// Usage: node shots.mjs <baseURL> <outDir>
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const pages = [
	'/',
	'/about',
	'/services',
	'/services/check-up-and-cleaning',
	'/doctors',
	'/doctors/anjali-menon',
	'/locations',
	'/locations/kakkanad',
	'/book',
	'/contact',
	'/certifications',
	'/privacy',
	'/admin/login',
	'/no-such-page'
];
const sizes = { desktop: { width: 1366, height: 900 }, mobile: { width: 390, height: 844 } };
const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(sizes)) {
	const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
	const page = await ctx.newPage();
	for (const p of pages) {
		await page.goto(base + p, { waitUntil: 'networkidle' });
		await page.addStyleTag({
			content:
				'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
		});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(300);
		const file = `${out}/${name}${p === '/' ? '_home' : p.replaceAll('/', '_')}.png`;
		await page.screenshot({ path: file, fullPage: true });
	}
	await ctx.close();
}
await browser.close();
console.log('done', out);
