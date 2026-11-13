import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import { auditLog } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import type { PageServerLoad } from './$types';

const PER_PAGE = 50;

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'audit:read');
	const sp = event.url.searchParams;
	const page = Math.max(1, Number(sp.get('page')) || 1);
	const q = sp.get('q')?.trim();
	const entity = sp.get('entity')?.trim();
	const conds: SQL[] = [];
	if (q) conds.push(or(like(auditLog.summary, `%${q}%`), like(auditLog.userEmail, `%${q}%`))!);
	if (entity) conds.push(eq(auditLog.entity, entity));
	const rows = await event.locals.db
		.select()
		.from(auditLog)
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(auditLog.createdAt))
		.limit(PER_PAGE + 1)
		.offset((page - 1) * PER_PAGE);
	return { title: 'Audit log', rows: rows.slice(0, PER_PAGE), hasMore: rows.length > PER_PAGE, page, q: q ?? '', entity: entity ?? '' };
};
