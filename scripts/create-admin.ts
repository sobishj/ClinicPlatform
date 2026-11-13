/**
 * Create (or reset the password of) a super-admin.
 *
 *   npm run create-admin -- --email=owner@clinic.com --name="Clinic Owner" [--password=…]
 *   npm run create-admin -- --email=owner@clinic.com --sql=admin.sql   # for D1, then:
 *   npx wrangler d1 execute clinic-db --remote --file=admin.sql
 *
 * Without --password a strong random password is generated and printed once.
 */
import { writeFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { parseArgs, openDb } from './lib/db.js';
import { users } from '../src/lib/server/db/schema.js';
import { hashPassword, randomToken } from '../src/lib/server/crypto.js';

const args = parseArgs();
const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
	console.error('Usage: npm run create-admin -- --email=you@example.com [--name="Your Name"] [--password=…] [--sql=file]');
	process.exit(1);
}
const name = typeof args.name === 'string' ? args.name : 'Administrator';
const generated = typeof args.password !== 'string';
const password = generated ? randomToken(12) : (args.password as string);
if (password.length < 10) {
	console.error('Password must be at least 10 characters.');
	process.exit(1);
}
const passwordHash = await hashPassword(password);
const role = typeof args.role === 'string' ? args.role : 'super_admin';

if (typeof args.sql === 'string') {
	const id = crypto.randomUUID();
	const now = Date.now();
	const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
	writeFileSync(
		args.sql,
		`INSERT INTO users (id, email, name, password_hash, role, active, created_at, updated_at) VALUES (${q(id)}, ${q(email)}, ${q(name)}, ${q(passwordHash)}, ${q(role)}, 1, ${now}, ${now})\n` +
			`ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, active = 1;\n`
	);
	console.log(`✓ Wrote ${args.sql}. Apply with:  npx wrangler d1 execute clinic-db --remote --file=${args.sql}`);
} else {
	const file = typeof args.db === 'string' ? args.db : (process.env.DATABASE_PATH ?? './data/clinic.db');
	const { db, sqlite } = openDb(file);
	const existing = await db.select().from(users).where(eq(users.email, email)).get();
	if (existing) {
		await db.update(users).set({ passwordHash, active: true, role: role as 'super_admin' }).where(eq(users.id, existing.id));
		console.log(`✓ Updated password for ${email}`);
	} else {
		await db.insert(users).values({ email, name, passwordHash, role: role as 'super_admin' });
		console.log(`✓ Created ${role} ${email}`);
	}
	sqlite.close();
}
if (generated) console.log(`  Password: ${password}\n  (shown once — change it after logging in)`);
