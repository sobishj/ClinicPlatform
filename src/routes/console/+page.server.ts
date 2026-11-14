import { asc } from 'drizzle-orm';
import { tenants, domains } from '#lib/server/platform-db/schema.js';
import { requireConsoleUser, consolePdb } from '#lib/server/console/auth.js';
import { getTemplate } from '#lib/templates/registry.js';
import { databaseSlots } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireConsoleUser(event);
	const pdb = consolePdb(event);
	const [rows, hosts] = await Promise.all([
		pdb.select().from(tenants).orderBy(asc(tenants.name)),
		pdb.select().from(domains).orderBy(asc(domains.hostname))
	]);
	const slots = databaseSlots(event.platform);
	return {
		title: 'Clients',
		clients: rows.map((t) => {
			const own = hosts.filter((d) => d.tenantId === t.id);
			return {
				id: t.id,
				slug: t.slug,
				name: t.name,
				status: t.status,
				template: getTemplate(t.templateKey)?.name ?? t.templateKey,
				primary: own.find((d) => d.isPrimary)?.hostname ?? null,
				domainCount: own.length,
				createdAt: t.createdAt
			};
		}),
		slots: slots
			? { total: slots.length, used: rows.filter((t) => slots.includes(t.dbRef)).length }
			: null
	};
};
