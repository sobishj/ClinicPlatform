import { test as setup } from '@playwright/test';
import { login } from './helpers.js';

/** Log in once and reuse the session (avoids tripping the login rate limiter). */
setup('authenticate admin', async ({ page }) => {
	await login(page);
	await page.context().storageState({ path: 'data/e2e-admin.json' });
});
