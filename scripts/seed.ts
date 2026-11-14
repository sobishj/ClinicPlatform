/**
 * Local development setup: two client sites plus a console login.
 *
 *   npm run seed                                   # Orchid + Demo (skips clients that already exist)
 *   npm run seed -- --console-email=you@example.com --console-password='a-long-password'
 *   npm run seed -- --reset                        # start over (deletes data/platform.db and data/tenants)
 *   npm run seed -- --e2e                          # used by the Playwright tests
 *
 * Clients created:
 *   Orchid Dental Care   orchid.localhost   Dental → Template 1. Imported from ./data/clinic.db (your existing
 *                                           single-site database, content + logins) when it exists,
 *                                           otherwise filled with the template's sample content.
 *   Demo Dental Clinic   demo.localhost     Dental → Template 1, sample content only.
 *
 * *.localhost names need no hosts-file entries in browsers. Console: http://console.localhost:5173
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { parseArgs, PATHS, openPlatformDb } from './lib/db.js';
import { tenants } from '../src/lib/server/platform-db/schema.js';

const args = parseArgs();
const run = (...a: string[]) =>
	execFileSync(process.execPath, ['--import', 'tsx', 'scripts/tenant.ts', ...a], {
		stdio: 'inherit'
	});

if (args.reset || args.e2e) {
	rmSync(PATHS.platformDb(), { force: true });
	rmSync(PATHS.platformDb() + '-wal', { force: true });
	rmSync(PATHS.platformDb() + '-shm', { force: true });
	rmSync(PATHS.tenantRoot(), { recursive: true, force: true });
}

const { sqlite, db } = openPlatformDb();
const exists = async (slug: string) =>
	!!(await db.select().from(tenants).where(eq(tenants.slug, slug)).get());
const orchid = await exists('orchid');
const demo = await exists('demo');
sqlite.close();

if (args.e2e) {
	// Tests: one client on plain localhost (the Playwright base URL) and a second one for isolation checks.
	run(
		'create',
		'--name=Orchid Dental Care',
		'--slug=orchid',
		'--domain=localhost',
		'--demo-appointments'
	);
	run('create', '--name=Demo Dental Clinic', '--slug=demo', '--domain=demo.localhost');
} else {
	if (orchid) console.log('• orchid already exists');
	else if (existsSync('data/clinic.db') && !args['sample-only'])
		run(
			'import',
			'--name=Orchid Dental Care',
			'--slug=orchid',
			'--domain=orchid.localhost',
			'--from=./data/clinic.db',
			'--uploads=./data/uploads'
		);
	else
		run(
			'create',
			'--name=Orchid Dental Care',
			'--slug=orchid',
			'--domain=orchid.localhost',
			'--demo-appointments'
		);
	if (demo) console.log('• demo already exists');
	else
		run(
			'create',
			'--name=Demo Dental Clinic',
			'--slug=demo',
			'--domain=demo.localhost',
			'--demo-appointments'
		);
}

if (typeof args['console-email'] === 'string' && typeof args['console-password'] === 'string') {
	run(
		'console-admin',
		`--email=${args['console-email']}`,
		`--password=${args['console-password']}`
	);
}

console.log(`
Sites (npm run dev):   http://orchid.localhost:5173   http://demo.localhost:5173
Console:               http://console.localhost:5173  (first visit creates the console login, unless you passed --console-email)
`);
