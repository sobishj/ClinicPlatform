import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production Node build with its own seeded database
 * (data/e2e.db), so they never touch your development data.
 */
const PORT = 4173;
const env = {
	PORT: String(PORT),
	ORIGIN: `http://localhost:${PORT}`,
	DATABASE_PATH: './data/e2e.db',
	UPLOAD_DIR: './data/e2e-uploads',
	EMAIL_PROVIDER: 'none'
};

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	timeout: 60_000,
	use: { baseURL: env.ORIGIN, trace: 'retain-on-failure' },
	projects: [
		{ name: 'setup', testMatch: /auth.setup.ts/ },
		{ name: 'public', testMatch: /(booking|a11y).e2e.ts/, use: { ...devices['Desktop Chrome'] } },
		{ name: 'admin', testMatch: /admin.e2e.ts/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'], storageState: 'data/e2e-admin.json' } }
	],
	webServer: {
		command:
			'npm run seed -- --profile=dental && npm run create-admin -- --email=e2e@example.com --password=E2E-password-123 && npm run build:node && node build',
		env,
		url: `${env.ORIGIN}/robots.txt`,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000
	}
});
