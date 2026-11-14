/**
 * Manage clients from the command line (local / server installs; on Cloudflare use the console).
 *
 *   npm run tenant -- list
 *   npm run tenant -- create --name="Smile Care" [--slug=smile] [--template=dental/template-1]
 *                            --domain=smile.localhost [--domain=www.smilecare.in]
 *                            [--admin-email=… --admin-password=… --admin-name=…] [--demo-appointments]
 *   npm run tenant -- import --name="Orchid Dental Care" --slug=orchid --domain=orchid.localhost
 *                            --from=./data/clinic.db | --from=./d1-export.sql  [--uploads=./data/uploads]
 *   npm run tenant -- admin --slug=orchid --email=… --password=… [--name=…] [--role=clinic_admin|branch_staff|super_admin]
 *   npm run tenant -- domain --slug=orchid --add=www.orchiddental.in [--primary]
 *   npm run tenant -- domain --slug=orchid --remove=orchid.localhost
 *   npm run tenant -- delete --slug=orchid          (moves its database + files to data/tenants/_deleted/)
 *   npm run tenant -- migrate                       (apply pending migrations to every database)
 *   npm run tenant -- console-admin --email=… --password=… [--name=…]
 *
 * `import` turns an existing single-clinic database (the old one-site version, a local .db file
 * or `wrangler d1 export` output) into a client, keeping all content, logins and bookings.
 */
import Database from 'better-sqlite3';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { asc, eq } from 'drizzle-orm';
import {
	parseArgs,
	PATHS,
	openDb,
	openPlatformDb,
	migrateSync,
	TENANT_MIGRATIONS,
	readTemplate
} from './lib/db.js';
import { tenants, domains, platformUsers } from '../src/lib/server/platform-db/schema.js';
import { seedSampleContent, upsertClientUser } from '../src/lib/server/tenancy/seed.js';
import { normalizeHostname } from '../src/lib/server/tenancy/hosts.js';
import { hashPassword } from '../src/lib/server/crypto.js';
import { slugify } from '../src/lib/slug.js';
import type { ClinicType } from '../src/lib/settings/schema.js';

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));
/** Repeated flags (--domain=a --domain=b). */
const many = (name: string) =>
	process.argv
		.slice(3)
		.filter((a) => a.startsWith(`--${name}=`))
		.map((a) => a.slice(name.length + 3));
const str = (name: string) => (typeof args[name] === 'string' ? (args[name] as string) : undefined);
const need = (name: string) => str(name) ?? fail(`Missing --${name}=…`);
function fail(msg: string): never {
	console.error(`✗ ${msg}`);
	process.exit(1);
}

const { sqlite: psql, db: pdb } = openPlatformDb();

async function tenantBySlug(slug: string) {
	return (
		(await pdb.select().from(tenants).where(eq(tenants.slug, slug)).get()) ??
		fail(`No client with handle "${slug}".`)
	);
}

async function checkDomains(list: string[]): Promise<string[]> {
	const out: string[] = [];
	for (const raw of list) {
		const host = normalizeHostname(raw) ?? fail(`"${raw}" is not a valid web address.`);
		if (await pdb.select().from(domains).where(eq(domains.hostname, host)).get())
			fail(`${host} is already used by a client.`);
		if (!out.includes(host)) out.push(host);
	}
	return out;
}

async function register(
	tenantId: string,
	slug: string,
	name: string,
	templateKey: string,
	hosts: string[]
) {
	await pdb.insert(tenants).values({ id: tenantId, slug, name, templateKey, dbRef: tenantId });
	if (hosts.length)
		await pdb
			.insert(domains)
			.values(hosts.map((hostname, i) => ({ tenantId, hostname, isPrimary: i === 0 })));
}

async function prepare() {
	const name = need('name');
	const slug = slugify(str('slug') ?? name).slice(0, 60);
	if (await pdb.select().from(tenants).where(eq(tenants.slug, slug)).get())
		fail(`The handle "${slug}" is already used.`);
	const templateKey = str('template') ?? 'dental/template-1';
	const template = readTemplate(templateKey) ?? fail(`Unknown template "${templateKey}".`);
	const hosts = await checkDomains(many('domain'));
	return { name, slug, template, hosts, tenantId: crypto.randomUUID() };
}

/** Copy legacy files: <uploads dir>/uploads/… → <tenant files>/uploads/… */
function copyUploads(from: string, tenantId: string) {
	const src = path.resolve(from);
	if (!existsSync(src)) return 0;
	const inner = existsSync(path.join(src, 'uploads')) ? path.join(src, 'uploads') : src;
	const dest = path.join(PATHS.tenantFiles(tenantId), 'uploads');
	mkdirSync(dest, { recursive: true });
	cpSync(inner, dest, { recursive: true });
	return 1;
}

/** Files that lived in D1 (media_chunks) become files on disk for the server build. */
function extractChunks(db: Database.Database, tenantId: string): number {
	const rows = db.prepare('SELECT key, data FROM media_chunks ORDER BY key, idx').all() as {
		key: string;
		data: Buffer;
	}[];
	const files = new Map<string, Buffer[]>();
	for (const r of rows) files.set(r.key, [...(files.get(r.key) ?? []), r.data]);
	for (const [key, parts] of files) {
		if (!key.startsWith('uploads/') || key.includes('..')) continue;
		const file = path.join(PATHS.tenantFiles(tenantId), key);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, Buffer.concat(parts));
	}
	return files.size;
}

switch (cmd) {
	case 'list': {
		const rows = await pdb.select().from(tenants).orderBy(asc(tenants.slug));
		const hosts = await pdb.select().from(domains);
		if (!rows.length) console.log('No clients yet.');
		for (const t of rows) {
			const own = hosts
				.filter((d) => d.tenantId === t.id)
				.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
			console.log(
				`${t.slug.padEnd(20)} ${t.status.padEnd(10)} ${t.templateKey.padEnd(20)} ${own.map((d) => d.hostname).join(', ') || '(no address)'}`
			);
		}
		break;
	}

	case 'create': {
		const p = await prepare();
		const { sqlite, db } = openDb(PATHS.tenantDb(p.tenantId));
		await seedSampleContent(db, {
			profile: p.template.sampleProfile as ClinicType,
			clinicName: p.name,
			demoAppointments: !!args['demo-appointments']
		});
		if (str('admin-email')) {
			const password = need('admin-password');
			if (password.length < 10) fail('The admin password needs at least 10 characters.');
			await upsertClientUser(db, {
				email: need('admin-email'),
				name: str('admin-name') ?? need('admin-email'),
				password,
				role: 'clinic_admin'
			});
		}
		sqlite.close();
		await register(p.tenantId, p.slug, p.name, p.template.key, p.hosts);
		console.log(
			`✓ Created "${p.name}" (${p.slug}) on ${p.template.name}${p.hosts.length ? ` at ${p.hosts.join(', ')}` : ' — add an address with: npm run tenant -- domain'}`
		);
		break;
	}

	case 'import': {
		const p = await prepare();
		const from = path.resolve(need('from'));
		if (!existsSync(from)) fail(`${from} not found.`);
		const dest = PATHS.tenantDb(p.tenantId);
		mkdirSync(path.dirname(dest), { recursive: true });
		if (from.endsWith('.sql')) {
			const db = new Database(dest);
			db.exec(readFileSync(from, 'utf8'));
			db.close();
		} else {
			const src = new Database(from, { readonly: true, fileMustExist: true });
			await src.backup(dest); // consistent copy, includes the WAL
			src.close();
		}
		const db = new Database(dest);
		db.pragma('journal_mode = WAL');
		const applied = migrateSync(db, TENANT_MIGRATIONS());
		const extracted = extractChunks(db, p.tenantId);
		const stats = ['locations', 'doctors', 'services', 'users', 'appointments'].map(
			(t) => `${t} ${(db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }).n}`
		);
		db.close();
		const uploads = str('uploads') ?? (from.endsWith('.sql') ? undefined : './data/uploads');
		if (uploads) copyUploads(uploads, p.tenantId);
		await register(p.tenantId, p.slug, p.name, p.template.key, p.hosts);
		console.log(
			`✓ Imported "${p.name}" (${p.slug}) from ${path.basename(from)}: ${stats.join(', ')}`
		);
		if (applied.length) console.log(`  Applied migrations: ${applied.join(', ')}`);
		if (extracted) console.log(`  ${extracted} uploaded files extracted from the database`);
		if (p.hosts.length) console.log(`  Address: ${p.hosts.join(', ')}`);
		break;
	}

	case 'admin': {
		const t = await tenantBySlug(need('slug'));
		const role = (str('role') ?? 'clinic_admin') as 'clinic_admin' | 'branch_staff' | 'super_admin';
		if (!['clinic_admin', 'branch_staff', 'super_admin'].includes(role))
			fail('Role must be clinic_admin, branch_staff or super_admin.');
		const password = need('password');
		if (password.length < 10) fail('Use at least 10 characters.');
		const { sqlite, db } = openDb(PATHS.tenantDb(t.dbRef));
		await upsertClientUser(db, {
			email: need('email'),
			name: str('name') ?? need('email'),
			password,
			role
		});
		sqlite.close();
		console.log(`✓ Login saved for ${need('email')} on ${t.name} (${role})`);
		break;
	}

	case 'domain': {
		const t = await tenantBySlug(need('slug'));
		if (str('add')) {
			const [host] = await checkDomains([str('add')!]);
			const primary =
				!!args.primary ||
				!(await pdb.select().from(domains).where(eq(domains.tenantId, t.id))).some(
					(d) => d.isPrimary
				);
			if (primary)
				await pdb.update(domains).set({ isPrimary: false }).where(eq(domains.tenantId, t.id));
			await pdb.insert(domains).values({ tenantId: t.id, hostname: host, isPrimary: primary });
			console.log(`✓ ${host} added to ${t.name}${primary ? ' (main address)' : ''}`);
		} else if (str('remove')) {
			const host = normalizeHostname(str('remove')!) ?? fail('Invalid address.');
			await pdb.delete(domains).where(eq(domains.hostname, host));
			console.log(`✓ ${host} removed`);
		} else fail('Use --add=… or --remove=…');
		break;
	}

	case 'delete': {
		const t = await tenantBySlug(need('slug'));
		await pdb.delete(tenants).where(eq(tenants.id, t.id));
		const dir = path.dirname(PATHS.tenantDb(t.dbRef));
		if (existsSync(dir)) {
			const target = path.join(
				PATHS.tenantRoot(),
				'_deleted',
				`${t.dbRef}-${new Date().toISOString().replace(/[:.]/g, '-')}`
			);
			mkdirSync(path.dirname(target), { recursive: true });
			renameSync(dir, target);
			console.log(`✓ Deleted ${t.name}. Its database and files were moved to ${target}`);
		} else console.log(`✓ Deleted ${t.name}.`);
		break;
	}

	case 'migrate': {
		const rows = await pdb.select().from(tenants);
		console.log('✓ platform: up to date');
		let failed = 0;
		for (const t of rows) {
			try {
				const { sqlite } = openDb(PATHS.tenantDb(t.dbRef));
				sqlite.close();
				console.log(`✓ ${t.slug}: up to date`);
			} catch (err) {
				failed++;
				console.error(`✗ ${t.slug}: ${(err as Error).message}`);
			}
		}
		if (failed) process.exitCode = 1;
		break;
	}

	case 'console-admin': {
		const email = need('email').trim().toLowerCase();
		const password = need('password');
		if (password.length < 10) fail('Use at least 10 characters.');
		const passwordHash = await hashPassword(password);
		const existing = await pdb
			.select()
			.from(platformUsers)
			.where(eq(platformUsers.email, email))
			.get();
		if (existing)
			await pdb
				.update(platformUsers)
				.set({ passwordHash, active: true })
				.where(eq(platformUsers.id, existing.id));
		else
			await pdb.insert(platformUsers).values({ email, name: str('name') ?? email, passwordHash });
		console.log(`✓ Console login saved for ${email}`);
		break;
	}

	default:
		console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
		process.exitCode = cmd ? 1 : 0;
}
psql.close();
