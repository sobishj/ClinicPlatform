import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { webhooks, webhookDeliveries } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { attemptDelivery } from '#lib/server/integrations/webhooks.js';
import { failMessage } from '#lib/server/forms.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'integrations:manage');
	const hook = await event.locals.db.select({ id: webhooks.id, name: webhooks.name, url: webhooks.url }).from(webhooks).where(eq(webhooks.id, event.params.id)).get();
	if (!hook) error(404, 'Webhook not found');
	const deliveries = await event.locals.db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookId, hook.id)).orderBy(desc(webhookDeliveries.createdAt)).limit(100);
	return { title: `Webhook log · ${hook.name}`, hook, deliveries };
};

export const actions: Actions = {
	retry: async (event) => {
		requirePermission(event, 'integrations:manage');
		const id = String((await event.request.formData()).get('id') ?? '');
		const row = await event.locals.db.select().from(webhookDeliveries).where(and(eq(webhookDeliveries.id, id), eq(webhookDeliveries.webhookId, event.params.id))).get();
		if (!row) return failMessage('Not found', 404);
		await event.locals.db.update(webhookDeliveries).set({ status: 'pending', attempts: 0 }).where(eq(webhookDeliveries.id, id));
		const ok = await attemptDelivery(event.locals.db, id);
		return ok ? { ok: true } : failMessage('Still failing — see the error column.');
	}
};
