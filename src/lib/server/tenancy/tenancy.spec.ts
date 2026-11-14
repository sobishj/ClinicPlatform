import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { normalizeHostname } from './hosts.js';
import { sampleContentStatements, seedSampleContent, upsertClientUser, inlineSql } from './seed.js';
import { migrate, splitStatements, toMigrations } from '../db/migrator.js';
import { TENANT_MIGRATIONS, PLATFORM_MIGRATIONS } from '../db/migrations.js';
import * as schema from '../db/schema.js';
import { TEMPLATES, getTemplate, DEFAULT_TEMPLATE } from '../../templates/registry.js';
import { verifyPassword } from '../crypto.js';
import type { DB } from '../db/index.js';

const memoryDb = () => {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	return { sqlite, db: drizzle(sqlite, { schema }) as unknown as DB };
};
const count = (sqlite: Database.Database, table: string) =>
	(sqlite.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n;

describe('normalizeHostname', () => {
	it.each([
		['www.Clinic.com', 'www.clinic.com'],
		['https://www.clinic.com/about?x=1', 'www.clinic.com'],
		['clinic.com:443', 'clinic.com'],
		['orchid.localhost', 'orchid.localhost'],
		['  clinic.co.in.  ', 'clinic.co.in'],
		['localhost', 'localhost'],
		['127.0.0.1', '127.0.0.1']
	])('%s → %s', (input, out) => expect(normalizeHostname(input)).toBe(out));

	it.each(['', 'not a host', 'exa_mple.com', '-bad.com', 'a..b', 'javascript:alert(1)'])(
		'rejects %j',
		(input) => expect(normalizeHostname(input)).toBeNull()
	);
});

describe('migrations', () => {
	it('are bundled for both databases and split into statements', () => {
		expect(TENANT_MIGRATIONS.map((m) => m.name)).toEqual([
			'0000_init',
			'0001_messages',
			'0002_media_chunks'
		]);
		expect(PLATFORM_MIGRATIONS[0].name).toBe('0000_init');
		expect(splitStatements(TENANT_MIGRATIONS[0].sql).length).toBeGreaterThan(20);
		expect(toMigrations({ '/x/0001_b.sql': 'b', '/x/0000_a.sql': 'a' }).map((m) => m.name)).toEqual(
			['0000_a', '0001_b']
		);
	});

	it('create a fresh database once and are idempotent', async () => {
		const { sqlite, db } = memoryDb();
		expect(await migrate(db as never, TENANT_MIGRATIONS)).toHaveLength(3);
		expect(await migrate(db as never, TENANT_MIGRATIONS)).toHaveLength(0);
		expect(count(sqlite, 'locations')).toBe(0);
	});

	it('adopt a database created by drizzle’s own migrator (the old single-site version)', async () => {
		const { sqlite, db } = memoryDb();
		for (const m of TENANT_MIGRATIONS.slice(0, 2))
			for (const s of splitStatements(m.sql)) sqlite.exec(s);
		sqlite.exec(
			'CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)'
		);
		sqlite.exec("INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('a', 1), ('b', 2)");
		expect(await migrate(db as never, TENANT_MIGRATIONS)).toEqual(['0002_media_chunks']);
	});

	it('adopt a database created by wrangler d1 migrations', async () => {
		const { sqlite, db } = memoryDb();
		for (const m of TENANT_MIGRATIONS) for (const s of splitStatements(m.sql)) sqlite.exec(s);
		sqlite.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)');
		sqlite.exec(
			"INSERT INTO d1_migrations (name) VALUES ('0000_init.sql'), ('0001_messages.sql'), ('0002_media_chunks.sql')"
		);
		expect(await migrate(db as never, TENANT_MIGRATIONS)).toEqual([]);
	});
});

describe('template registry', () => {
	it('has the original design as Dental → Template 1', () => {
		const t = getTemplate(DEFAULT_TEMPLATE);
		expect(t?.category.key).toBe('dental');
		expect(t?.sampleProfile).toBe('dental');
		expect(TEMPLATES.every((x) => x.key.split('/').length === 2)).toBe(true);
	});
});

describe('sample content seeding', () => {
	it('fills an empty client database with the template’s sample content', async () => {
		const { sqlite, db } = memoryDb();
		await migrate(db as never, TENANT_MIGRATIONS);
		await seedSampleContent(db, {
			profile: 'dental',
			clinicName: "Smile O'Brien Care",
			demoAppointments: true
		});
		expect(count(sqlite, 'locations')).toBe(3);
		expect(count(sqlite, 'doctors')).toBeGreaterThan(2);
		expect(count(sqlite, 'services')).toBeGreaterThan(5);
		expect(count(sqlite, 'appointments')).toBe(6);
		const clinic = JSON.parse(
			(sqlite.prepare("SELECT value FROM settings WHERE key = 'clinic'").get() as { value: string })
				.value
		);
		expect(clinic.name).toBe("Smile O'Brien Care");
		// JSON and boolean columns read back through drizzle exactly as written.
		const doc = await db.select().from(schema.doctors).limit(1).get();
		expect(Array.isArray(doc?.languages)).toBe(true);
		expect(typeof doc?.featured).toBe('boolean');
		await expect(seedSampleContent(db, { profile: 'dental' })).rejects.toThrow(
			/already has content/
		);
	});

	it('inlines parameters safely (quotes, null, booleans)', () => {
		const { db } = memoryDb();
		const q = db
			.insert(schema.blocks)
			.values({ collection: "it's", data: { a: "b'c" }, active: false, sortOrder: 1 });
		const text = inlineSql(q);
		expect(text).toContain("'it''s'");
		expect(text).toContain(`'{"a":"b''c"}'`);
		expect(text).not.toContain('?');
		expect(sampleContentStatements(db, { profile: 'dental' }).length).toBeGreaterThan(20);
	});

	it('creates and resets client logins', async () => {
		const { sqlite, db } = memoryDb();
		await migrate(db as never, TENANT_MIGRATIONS);
		const id = await upsertClientUser(db, {
			email: 'Owner@Clinic.com ',
			name: 'Owner',
			password: 'first-password-1',
			role: 'clinic_admin'
		});
		const again = await upsertClientUser(db, {
			email: 'owner@clinic.com',
			name: 'Owner',
			password: 'second-password-2',
			role: 'branch_staff'
		});
		expect(again).toBe(id);
		const row = sqlite.prepare('SELECT email, role, password_hash FROM users').get() as {
			email: string;
			role: string;
			password_hash: string;
		};
		expect(row.email).toBe('owner@clinic.com');
		expect(row.role).toBe('branch_staff');
		expect(await verifyPassword('second-password-2', row.password_hash)).toBe(true);
		expect(count(sqlite, 'users')).toBe(1);
		await db.run(sql`SELECT 1`);
	});
});
