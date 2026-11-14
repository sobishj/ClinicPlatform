import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { ADMIN } from './helpers.js';

/**
 * Multi-client platform: console (add client, template, addresses), host routing, primary
 * redirects, suspension, and isolation between clients. Hosts: localhost = orchid,
 * demo.localhost = demo, console.localhost = console (browsers resolve *.localhost locally).
 */
const PORT = 4173;
const at = (host: string, path = '/') => `http://${host}:${PORT}${path}`;

async function consoleLogin(page: Page) {
	await page.goto(at('console.localhost', '/console/login'));
	await page.getByLabel('Email').fill(ADMIN.email);
	await page.getByLabel('Password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/console$/);
}

async function adminLogin(page: Page, host: string, email: string, password: string) {
	await page.goto(at(host, '/admin/login'));
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

/**
 * Server-side requests (no browser): Node can't resolve *.localhost, so connect to localhost and
 * name the site in the Host header, exactly as a reverse proxy would.
 */
const fetchAs = (
	request: APIRequestContext,
	host: string,
	path = '/',
	headers: Record<string, string> = {}
) =>
	request.get(`http://localhost:${PORT}${path}`, {
		maxRedirects: 0,
		headers: { host: `${host}:${PORT}`, ...headers }
	});
const status = async (
	request: APIRequestContext,
	host: string,
	path = '/',
	headers?: Record<string, string>
) => (await fetchAs(request, host, path, headers)).status();

test.describe.configure({ mode: 'serial' });

test('each host serves its own client; unknown hosts and cross-area paths get a bare 404', async ({
	page,
	request
}) => {
	await page.goto(at('localhost'));
	await expect(page).toHaveTitle(/Orchid Dental Care/);
	await page.goto(at('demo.localhost'));
	await expect(page).toHaveTitle(/Demo Dental Clinic/);
	await expect(page.locator('body')).not.toContainText('Orchid');

	const unknown = await fetchAs(request, 'nobody.localhost');
	expect(unknown.status()).toBe(404);
	expect(await unknown.text()).not.toMatch(/Orchid|Demo|console/i);

	expect(await status(request, 'localhost', '/console')).toBe(404);
	expect(await status(request, 'console.localhost', '/admin')).toBe(404);
	expect(await status(request, 'console.localhost', '/')).toBe(303);
});

test('a client login only works on that client’s own site', async ({ page, request }) => {
	await adminLogin(page, 'localhost', ADMIN.email, ADMIN.password);
	await expect(page).toHaveURL(/\/admin$/);
	const cookie = (await page.context().cookies(at('localhost'))).find(
		(c) => c.name === 'clinic_session'
	);
	expect(cookie).toBeTruthy();
	// The same session token presented to another client is unknown there.
	expect(
		await status(request, 'demo.localhost', '/admin', { cookie: `clinic_session=${cookie!.value}` })
	).toBe(303);
	// And the console never accepts client sessions.
	expect(
		await status(request, 'console.localhost', '/console', {
			cookie: `clinic_session=${cookie!.value}`
		})
	).toBe(303);
});

test('console: add a client with a template and addresses, then manage it', async ({
	page,
	request
}) => {
	await consoleLogin(page);
	await page.getByRole('link', { name: 'Add client' }).first().click();
	await page.getByLabel('Clinic name', { exact: true }).fill('Smile Care Clinic');
	await expect(page.getByLabel('Handle', { exact: true })).toHaveValue('smile-care-clinic');
	await page.getByLabel('Handle', { exact: true }).fill('smile');
	await page.getByRole('radio', { name: /Dental — Template 1/ }).check();
	await page.getByLabel('Client URLs', { exact: true }).fill('smile.localhost\nwww.smile.localhost');
	await page.getByLabel('Name', { exact: true }).fill('Smile Admin');
	await page.getByLabel('Email').fill('owner@smile.example');
	await page.getByLabel('Password').fill('Smile-password-123');
	await page.getByRole('button', { name: 'Create client' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Smile Care Clinic' })).toBeVisible();
	await expect(page.getByText('Client created with its own database')).toBeVisible();

	// The new site is live on its main address with the template's sample content.
	await page.goto(at('smile.localhost'));
	await expect(page).toHaveTitle(/Smile Care Clinic/);
	await expect(page.getByRole('link', { name: /Book/ }).first()).toBeVisible();
	// The second address redirects to the main one.
	const r = await fetchAs(request, 'www.smile.localhost', '/doctors');
	expect(r.status()).toBe(301);
	expect(r.headers().location).toBe(at('smile.localhost', '/doctors'));

	// The client admin can sign in on their own address…
	await adminLogin(page, 'smile.localhost', 'owner@smile.example', 'Smile-password-123');
	await expect(page).toHaveURL(/smile\.localhost:\d+\/admin$/);
	// …but that login doesn't exist on another client.
	await adminLogin(page, 'demo.localhost', 'owner@smile.example', 'Smile-password-123');
	await expect(page.getByRole('alert')).toContainText('incorrect');
});

test('console: open site admin signs the console user into that client only', async ({ page }) => {
	await consoleLogin(page);
	await page.getByRole('link', { name: 'Smile Care Clinic' }).click();
	await page.getByRole('button', { name: 'Open site admin' }).click();
	await expect(page).toHaveURL(/smile\.localhost:\d+\/admin$/);
	await expect(page.getByText('Smile Care Clinic').first()).toBeVisible();
	await page.goto(at('demo.localhost', '/admin'));
	await expect(page).toHaveURL(/demo\.localhost:\d+\/admin\/login/);
});

test('console: suspend, change the main address, delete', async ({ page, request }) => {
	await consoleLogin(page);
	await page.getByRole('link', { name: 'Smile Care Clinic' }).click();

	await page.getByLabel('Status', { exact: true }).selectOption('suspended');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
	const suspended = await fetchAs(request, 'smile.localhost');
	expect(suspended.status()).toBe(503);
	expect(await suspended.text()).not.toContain('Smile');

	await page.getByLabel('Status', { exact: true }).selectOption('active');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
	expect(await status(request, 'smile.localhost', '/')).toBe(200);

	await page
		.getByRole('listitem')
		.filter({ hasText: 'www.smile.localhost' })
		.getByRole('button', { name: 'Make main' })
		.click();
	await expect(page.getByRole('listitem').filter({ hasText: 'www.smile.localhost' })).toContainText(
		'Main address'
	);
	expect(await status(request, 'smile.localhost', '/')).toBe(301);

	await page.getByLabel('Type smile to confirm').fill('smile');
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page).toHaveURL(/\/console$/);
	await expect(page.getByRole('link', { name: 'Smile Care Clinic' })).toHaveCount(0);
	expect(await status(request, 'www.smile.localhost', '/')).toBe(404);
});
