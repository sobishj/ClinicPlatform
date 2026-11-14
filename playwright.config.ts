import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production Node build with its own seeded databases
 * (data/e2e/), so they never touch your development data.
 *
 * Clients: "orchid" on localhost (the base URL) and "demo" on demo.localhost; the console is on
 * console.localhost. No ORIGIN is set: each request's Host header picks the client.
 */
const PORT = 4173;
const env = {
	PORT: String(PORT),
	PLATFORM_DATABASE_PATH: './data/e2e/platform.db',
	TENANT_DATA_DIR: './data/e2e/tenants',
	PLATFORM_ADMIN_HOST: 'console.localhost',
	// adapter-node assumes https unless a proxy says otherwise; the tests send this header (see `use`).
	PROTOCOL_HEADER: 'x-forwarded-proto',
	EMAIL_PROVIDER: 'none'
};
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	timeout: 60_000,
	use: {
		baseURL: BASE,
		trace: 'retain-on-failure',
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	},
	projects: [
		{ name: 'setup', testMatch: /auth.setup.ts/ },
		{
			name: 'public',
			testMatch: /(booking|a11y|platform).e2e.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'admin',
			testMatch: /admin.e2e.ts/,
			dependencies: ['setup'],
			use: { ...devices['Desktop Chrome'], storageState: 'data/e2e-admin.json' }
		}
	],
	webServer: {
		command:
			'npm run seed -- --e2e --console-email=e2e@example.com --console-password=E2E-password-123 && npm run tenant -- admin --slug=orchid --email=e2e@example.com --password=E2E-password-123 --role=super_admin && npm run build:node && node build',
		env,
		url: `${BASE}/robots.txt`,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000
	}
});
