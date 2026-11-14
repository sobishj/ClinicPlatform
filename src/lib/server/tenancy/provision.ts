/**
 * Adding, changing and removing clients. Used by the console and the CLI.
 *
 * Add client = create the client's own database → apply migrations → seed the template's
 * sample content → create the client's admin login → register the client and its domains.
 * Any failure undoes the steps already done.
 */
import { and, eq, ne, sql } from 'drizzle-orm';
import type { PlatformDB } from '../platform-db/index.js';
import { tenants, domains, platformAudit } from '../platform-db/schema.js';
import type { DB } from '../db/index.js';
import { execStatements, migrate } from '../db/migrator.js';
import { TENANT_MIGRATIONS } from '../db/migrations.js';
import { getTemplate } from '../../templates/registry.js';
import { seedSampleContent, upsertClientUser } from './seed.js';
import { invalidateHostCache, normalizeHostname } from './hosts.js';
import {
	getTenantDb,
	createTenantDatabase,
	retireTenantDatabase,
	databaseSlots
} from '../platform.js';
import { slugify } from '../../slug.js';

export class ProvisionError extends Error {
	constructor(
		message: string,
		public field?: string
	) {
		super(message);
	}
}

export interface NewClient {
	name: string;
	slug?: string;
	templateKey: string;
	/** Domains/URLs; the first becomes the primary unless `primary` is given. */
	domains: string[];
	primary?: string;
	admin?: { email: string; name: string; password: string };
	/** Cloudflare only: which TENANT_* binding to use. */
	slot?: string;
	/** Cloudflare only: allow wiping a slot that still holds a deleted client's data. */
	wipeSlot?: boolean;
	demoAppointments?: boolean;
}

export interface ProvisionResult {
	tenantId: string;
	slug: string;
	dbRef: string;
	steps: string[];
}

/** Reserved host names that can never belong to a client. */
export function reservedHosts(consoleHost: string): Set<string> {
	return new Set([consoleHost]);
}

export async function parseDomains(
	pdb: PlatformDB,
	input: string[],
	consoleHost: string,
	tenantId?: string
): Promise<string[]> {
	const out: string[] = [];
	for (const raw of input) {
		if (!raw.trim()) continue;
		const host = normalizeHostname(raw);
		if (!host) throw new ProvisionError(`"${raw}" is not a valid web address.`, 'domains');
		if (reservedHosts(consoleHost).has(host))
			throw new ProvisionError(`${host} is reserved for the console.`, 'domains');
		if (!out.includes(host)) out.push(host);
	}
	for (const host of out) {
		const taken = await pdb
			.select({ tenantId: domains.tenantId })
			.from(domains)
			.where(
				tenantId
					? and(eq(domains.hostname, host), ne(domains.tenantId, tenantId))
					: eq(domains.hostname, host)
			)
			.get();
		if (taken) throw new ProvisionError(`${host} is already used by another client.`, 'domains');
	}
	return out;
}

/** Slots (Cloudflare) that no client uses yet; null when databases are created on demand. */
export async function freeSlots(
	platform: App.Platform | undefined,
	pdb: PlatformDB
): Promise<string[] | null> {
	const slots = databaseSlots(platform);
	if (!slots) return null;
	const used = new Set(
		(await pdb.select({ dbRef: tenants.dbRef }).from(tenants)).map((r) => r.dbRef)
	);
	return slots.filter((s) => !used.has(s));
}

async function hasTables(db: DB): Promise<boolean> {
	const rows = await db.all<{ n: number }>(
		sql`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'locations'`
	);
	if (!Number(rows[0]?.n)) return false;
	const content = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM locations`);
	return Number(content[0]?.n) > 0;
}

/** Drop every table in a database (used to reuse a Cloudflare slot). */
export async function wipeDatabase(db: DB) {
	for (let pass = 0; pass < 5; pass++) {
		const tables = await db.all<{ name: string }>(
			sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'`
		);
		if (!tables.length) return;
		for (const t of tables) {
			try {
				await execStatements(db as never, [`DROP TABLE IF EXISTS "${t.name.replace(/"/g, '""')}"`]);
			} catch {
				/* retried next pass, after the tables that reference it are gone */
			}
		}
	}
}

export async function createClient(
	platform: App.Platform | undefined,
	pdb: PlatformDB,
	input: NewClient,
	opts: { consoleHost: string; actor?: string }
): Promise<ProvisionResult> {
	const steps: string[] = [];
	const name = input.name.trim();
	if (name.length < 2) throw new ProvisionError('Enter the client name.', 'name');
	const slug = slugify(input.slug?.trim() || name).slice(0, 60);
	if (!slug) throw new ProvisionError('Enter a short handle (letters and numbers).', 'slug');
	if (await pdb.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).get())
		throw new ProvisionError(`The handle "${slug}" is already used by another client.`, 'slug');
	const template = getTemplate(input.templateKey);
	if (!template) throw new ProvisionError('Choose a template.', 'templateKey');
	const hosts = await parseDomains(pdb, input.domains, opts.consoleHost);
	const primary = input.primary ? normalizeHostname(input.primary) : hosts[0];
	if (primary && !hosts.includes(primary))
		throw new ProvisionError(
			'The primary address must be one of the client’s addresses.',
			'domains'
		);

	const slots = await freeSlots(platform, pdb);
	if (slots && !slots.length)
		throw new ProvisionError(
			'No free database slot. Add a TENANT_* D1 binding in wrangler.toml and redeploy.',
			'slot'
		);
	if (slots && input.slot && !slots.includes(input.slot))
		throw new ProvisionError('That database slot is already in use.', 'slot');

	const tenantId = crypto.randomUUID();
	let dbRef: string | null = null;
	try {
		dbRef = await createTenantDatabase(
			platform,
			tenantId,
			slots ? (input.slot ?? slots[0]) : undefined
		);
		steps.push('Database created');
		const db = await getTenantDb(platform, dbRef);
		// A reused slot may have been wiped by another isolate; re-check cheaply.
		await migrate(db as never, TENANT_MIGRATIONS);
		if (await hasTables(db)) {
			if (!input.wipeSlot)
				throw new ProvisionError(
					'This database slot still holds an earlier client’s data. Tick “wipe” to reuse it.',
					'slot'
				);
			await wipeDatabase(db);
			await migrate(db as never, TENANT_MIGRATIONS);
		}
		steps.push('Tables created');
		await seedSampleContent(db, {
			profile: template.sampleProfile,
			clinicName: name,
			demoAppointments: input.demoAppointments
		});
		steps.push(`Sample content from “${template.name}” added`);
		if (input.admin?.email) {
			await upsertClientUser(db, { ...input.admin, role: 'clinic_admin' });
			steps.push(`Admin login created for ${input.admin.email}`);
		}
		await pdb
			.insert(tenants)
			.values({ id: tenantId, slug, name, templateKey: template.key, dbRef });
		if (hosts.length)
			await pdb
				.insert(domains)
				.values(hosts.map((hostname) => ({ tenantId, hostname, isPrimary: hostname === primary })));
		await pdb
			.insert(platformAudit)
			.values({
				userEmail: opts.actor ?? null,
				action: 'create',
				tenantId,
				summary: `Client “${name}” (${slug})`
			});
		steps.push('Client registered');
		invalidateHostCache();
		return { tenantId, slug, dbRef, steps };
	} catch (err) {
		// Undo: platform rows first, then the database.
		await pdb
			.delete(tenants)
			.where(eq(tenants.id, tenantId))
			.catch(() => {});
		if (dbRef) {
			if (databaseSlots(platform)) {
				const db = await getTenantDb(platform, dbRef).catch(() => null);
				if (db && !(err instanceof ProvisionError && err.field === 'slot'))
					await wipeDatabase(db).catch(() => {});
			} else await retireTenantDatabase(platform, dbRef).catch(() => {});
		}
		throw err;
	}
}

export async function deleteClient(
	platform: App.Platform | undefined,
	pdb: PlatformDB,
	tenantId: string,
	actor?: string
) {
	const t = await pdb.select().from(tenants).where(eq(tenants.id, tenantId)).get();
	if (!t) throw new ProvisionError('Client not found.');
	await pdb.delete(tenants).where(eq(tenants.id, tenantId));
	await retireTenantDatabase(platform, t.dbRef);
	await pdb
		.insert(platformAudit)
		.values({
			userEmail: actor ?? null,
			action: 'delete',
			tenantId,
			summary: `Client “${t.name}” (${t.slug})`
		});
	invalidateHostCache();
	return t;
}

export async function addDomain(
	pdb: PlatformDB,
	tenantId: string,
	raw: string,
	consoleHost: string,
	makePrimary = false
) {
	const [host] = await parseDomains(pdb, [raw], consoleHost, tenantId);
	if (!host) throw new ProvisionError('Enter a web address.', 'hostname');
	const existing = await pdb.select().from(domains).where(eq(domains.tenantId, tenantId));
	if (existing.some((d) => d.hostname === host))
		throw new ProvisionError(`${host} is already listed.`, 'hostname');
	const primary = makePrimary || !existing.some((d) => d.isPrimary);
	if (primary)
		await pdb.update(domains).set({ isPrimary: false }).where(eq(domains.tenantId, tenantId));
	await pdb.insert(domains).values({ tenantId, hostname: host, isPrimary: primary });
	invalidateHostCache();
	return host;
}

export async function setPrimaryDomain(pdb: PlatformDB, tenantId: string, domainId: string) {
	const d = await pdb
		.select()
		.from(domains)
		.where(and(eq(domains.id, domainId), eq(domains.tenantId, tenantId)))
		.get();
	if (!d) throw new ProvisionError('Address not found.');
	await pdb.update(domains).set({ isPrimary: false }).where(eq(domains.tenantId, tenantId));
	await pdb.update(domains).set({ isPrimary: true }).where(eq(domains.id, domainId));
	invalidateHostCache();
}

export async function removeDomain(pdb: PlatformDB, tenantId: string, domainId: string) {
	const d = await pdb
		.select()
		.from(domains)
		.where(and(eq(domains.id, domainId), eq(domains.tenantId, tenantId)))
		.get();
	if (!d) throw new ProvisionError('Address not found.');
	await pdb.delete(domains).where(eq(domains.id, domainId));
	if (d.isPrimary) {
		const next = await pdb.select().from(domains).where(eq(domains.tenantId, tenantId)).get();
		if (next) await pdb.update(domains).set({ isPrimary: true }).where(eq(domains.id, next.id));
	}
	invalidateHostCache();
}
