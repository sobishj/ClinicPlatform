import type { RequestEvent } from '@sveltejs/kit';
import { auditLog } from './db/schema.js';
import { markContentChanged } from './settings.js';

type AuditAction = 'create' | 'update' | 'delete' | 'reorder' | 'login' | 'logout' | 'status' | 'export' | 'other';

/** Record who did what. Never throws — auditing must not break the action itself. */
export async function audit(
	event: Pick<RequestEvent, 'locals'>,
	action: AuditAction,
	entity: string,
	entityId?: string | null,
	summary?: string
) {
	try {
		const user = event.locals.user;
		const apiKey = event.locals.apiKey;
		await event.locals.db.insert(auditLog).values({
			userId: user?.id ?? (apiKey ? `api:${apiKey.id}` : null),
			userEmail: user?.email ?? (apiKey ? `API key: ${apiKey.name}` : null),
			action,
			entity,
			entityId: entityId ?? null,
			summary: summary?.slice(0, 500) ?? null
		});
	} catch (err) {
		console.error('audit failed', err);
	}
}

/** Audit a content change and invalidate cached public pages. */
export async function contentChanged(
	event: Pick<RequestEvent, 'locals'>,
	action: AuditAction,
	entity: string,
	entityId?: string | null,
	summary?: string
) {
	await Promise.all([audit(event, action, entity, entityId, summary), markContentChanged(event.locals.db)]);
}
