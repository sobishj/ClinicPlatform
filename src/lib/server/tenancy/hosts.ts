/**
 * Which client a request belongs to, from its Host header. Results (including "unknown host")
 * are cached briefly in memory, so normal traffic costs no extra database query.
 */
import { eq } from 'drizzle-orm';
import type { PlatformDB } from '../platform-db/index.js';
import { tenants, domains } from '../platform-db/schema.js';

export interface SiteTenant {
	id: string;
	slug: string;
	name: string;
	status: 'active' | 'suspended';
	templateKey: string;
	dbRef: string;
}

export interface ResolvedSite {
	tenant: SiteTenant;
	/** The host every other domain of this client redirects to (null = no primary set). */
	primaryHost: string | null;
}

const TTL_MS = 30_000;
const cache = new Map<string, { value: ResolvedSite | null; expires: number }>();

/** Forget cached lookups (call after any change to clients or domains). */
export function invalidateHostCache() {
	cache.clear();
}

export async function resolveHost(pdb: PlatformDB, hostname: string): Promise<ResolvedSite | null> {
	const hit = cache.get(hostname);
	if (hit && hit.expires > Date.now()) return hit.value;

	const row = await pdb
		.select({
			id: tenants.id,
			slug: tenants.slug,
			name: tenants.name,
			status: tenants.status,
			templateKey: tenants.templateKey,
			dbRef: tenants.dbRef
		})
		.from(domains)
		.innerJoin(tenants, eq(tenants.id, domains.tenantId))
		.where(eq(domains.hostname, hostname))
		.get();

	let value: ResolvedSite | null = null;
	if (row) {
		const all = await pdb
			.select({ hostname: domains.hostname, isPrimary: domains.isPrimary })
			.from(domains)
			.where(eq(domains.tenantId, row.id));
		value = { tenant: row, primaryHost: all.find((d) => d.isPrimary)?.hostname ?? null };
	}
	if (cache.size > 5000) cache.clear();
	cache.set(hostname, { value, expires: Date.now() + TTL_MS });
	return value;
}

const HOST_RE =
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Turn what an admin typed ("https://www.Clinic.com/about", "clinic.com:443", "orchid.localhost")
 * into a bare lower-case host name, or null if it is not a valid host name.
 */
export function normalizeHostname(input: string): string | null {
	let v = input.trim().toLowerCase();
	if (!v) return null;
	v = v.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
	v = v.split(/[/?#]/)[0];
	v = v.replace(/:\d+$/, '').replace(/\.$/, '');
	if (v.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(v))
		return /^\d+\.\d+\.\d+\.\d+$/.test(v) ? v : null;
	return HOST_RE.test(v) ? v : null;
}
