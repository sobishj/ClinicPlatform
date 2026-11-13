import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiKeys, webhooks, webhookDeliveries } from '#lib/server/db/schema.js';
import { requirePermission } from '#lib/server/auth.js';
import { parsePayload, failMessage } from '#lib/server/forms.js';
import { audit } from '#lib/server/audit.js';
import { generateApiKey, API_SCOPES, type ApiScope } from '#lib/server/api/auth.js';
import { WEBHOOK_EVENTS } from '#lib/server/integrations/events.js';
import { attemptDelivery } from '#lib/server/integrations/webhooks.js';
import { PROVIDERS, providerDefinition } from '#lib/server/integrations/registry.js';
import { saveSettings } from '#lib/server/settings.js';
import { randomToken } from '#lib/server/crypto.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'integrations:manage');
	const db = event.locals.db;
	const s = event.locals.settings.integrations;
	const [keys, hooks, stats] = await Promise.all([
		db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, scopes: apiKeys.scopes, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt }).from(apiKeys).orderBy(desc(apiKeys.createdAt)),
		db.select({ id: webhooks.id, name: webhooks.name, url: webhooks.url, events: webhooks.events, active: webhooks.active }).from(webhooks).orderBy(desc(webhooks.createdAt)),
		db
			.select({ webhookId: webhookDeliveries.webhookId, status: webhookDeliveries.status, n: sql<number>`COUNT(*)` })
			.from(webhookDeliveries)
			.groupBy(webhookDeliveries.webhookId, webhookDeliveries.status)
	]);
	const def = providerDefinition(s.provider);
	return {
		title: 'Integrations & API',
		keys,
		hooks: hooks.map((h) => ({ ...h, stats: Object.fromEntries(stats.filter((x) => x.webhookId === h.id).map((x) => [x.status, x.n])) })),
		scopes: API_SCOPES,
		events: WEBHOOK_EVENTS,
		providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, description: p.description, fields: p.fields })),
		integrations: {
			provider: s.provider,
			// Non-secret provider config is shown; secret ones only report whether they are set.
			providerConfig: Object.fromEntries(def.fields.map((f) => [f.key, f.secret ? '' : (s.providerConfig[f.key] ?? '')])),
			providerSecretsSet: Object.fromEntries(def.fields.filter((f) => f.secret).map((f) => [f.key, !!s.providerConfig[f.key]])),
			useProviderAvailability: s.useProviderAvailability,
			whatsappCloud: { ...s.whatsappCloud, accessToken: '' },
			whatsappTokenSet: !!s.whatsappCloud.accessToken,
			sms: { ...s.sms, authToken: '' },
			smsTokenSet: !!s.sms.authToken,
			corsOrigins: s.corsOrigins
		},
		apiBase: `${event.url.origin}/api/v1`
	};
};

const httpsUrl = z.string().trim().url('Enter a full URL').refine((u) => u.startsWith('https://'), 'Webhook URLs must use https://');

export const actions: Actions = {
	createKey: async (event) => {
		const user = requirePermission(event, 'integrations:manage');
		const parsed = await parsePayload(event.request, z.object({ name: z.string().trim().min(2, 'Name the key (e.g. "Chatbot")').max(80), scopes: z.array(z.enum(Object.keys(API_SCOPES) as [ApiScope, ...ApiScope[]])).min(1, 'Choose at least one scope') }));
		if (!parsed.ok) return parsed.failure;
		const { key, prefix, hash } = await generateApiKey();
		await event.locals.db.insert(apiKeys).values({ name: parsed.data.name, prefix, keyHash: hash, scopes: parsed.data.scopes, createdBy: user.id });
		await audit(event, 'create', 'api_key', null, `${parsed.data.name} (${parsed.data.scopes.join(', ')})`);
		return { ok: true, newKey: key };
	},
	revokeKey: async (event) => {
		requirePermission(event, 'integrations:manage');
		const id = String((await event.request.formData()).get('id') ?? '');
		await event.locals.db.update(apiKeys).set({ revokedAt: Date.now() }).where(eq(apiKeys.id, id));
		await audit(event, 'update', 'api_key', id, 'Revoked');
		return { ok: true };
	},
	saveHook: async (event) => {
		requirePermission(event, 'integrations:manage');
		const parsed = await parsePayload(
			event.request,
			z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), url: httpsUrl, events: z.array(z.string()).min(1, 'Choose at least one event'), active: z.boolean().default(true) })
		);
		if (!parsed.ok) return parsed.failure;
		const { id, ...d } = parsed.data;
		const db = event.locals.db;
		if (id) {
			await db.update(webhooks).set(d).where(eq(webhooks.id, id));
			await audit(event, 'update', 'webhook', id, d.url);
			return { ok: true };
		}
		const secret = `whsec_${randomToken(24)}`;
		await db.insert(webhooks).values({ ...d, secret });
		await audit(event, 'create', 'webhook', null, d.url);
		return { ok: true, newSecret: secret };
	},
	rotateSecret: async (event) => {
		requirePermission(event, 'integrations:manage');
		const id = String((await event.request.formData()).get('id') ?? '');
		const secret = `whsec_${randomToken(24)}`;
		await event.locals.db.update(webhooks).set({ secret }).where(eq(webhooks.id, id));
		await audit(event, 'update', 'webhook', id, 'Secret rotated');
		return { ok: true, newSecret: secret };
	},
	deleteHook: async (event) => {
		requirePermission(event, 'integrations:manage');
		const id = String((await event.request.formData()).get('id') ?? '');
		await event.locals.db.delete(webhooks).where(eq(webhooks.id, id));
		await audit(event, 'delete', 'webhook', id, '');
		return { ok: true };
	},
	testHook: async (event) => {
		requirePermission(event, 'integrations:manage');
		const id = String((await event.request.formData()).get('id') ?? '');
		const db = event.locals.db;
		const hook = await db.select().from(webhooks).where(eq(webhooks.id, id)).get();
		if (!hook) return failMessage('Webhook not found', 404);
		// Deliver a test event to this webhook only.
		const deliveryId = crypto.randomUUID();
		const payload = JSON.stringify({ id: deliveryId, event: 'test', createdAt: new Date().toISOString(), data: { message: 'Test delivery from your clinic website' } });
		await db.insert(webhookDeliveries).values({ id: deliveryId, webhookId: id, event: 'test', payload, nextAttemptAt: Date.now() });
		const ok = await attemptDelivery(db, deliveryId);
		const row = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId)).get();
		return ok ? { ok: true, message: `Delivered (HTTP ${row?.responseStatus})` } : fail(400, { errors: {}, message: `Delivery failed: ${row?.lastError ?? 'unknown error'} — it will be retried.` });
	},
	saveIntegrations: async (event) => {
		requirePermission(event, 'integrations:manage');
		const current = event.locals.settings.integrations;
		const parsed = await parsePayload(
			event.request,
			z.object({
				provider: z.string(),
				providerConfig: z.record(z.string(), z.string()).default({}),
				useProviderAvailability: z.boolean().default(false),
				whatsappCloud: z.object({ enabled: z.boolean(), phoneNumberId: z.string().trim().max(60), accessToken: z.string().trim().max(1000), templateName: z.string().trim().max(120), templateLanguage: z.string().trim().max(10) }),
				sms: z.object({ enabled: z.boolean(), provider: z.enum(['none', 'webhook']), webhookUrl: z.union([z.literal(''), httpsUrl]), authToken: z.string().trim().max(1000) }),
				corsOrigins: z.string().trim().max(1000).default('')
			})
		);
		if (!parsed.ok) return parsed.failure;
		const d = parsed.data;
		const def = providerDefinition(d.provider);
		// Merge provider config: blank secret fields keep their stored value.
		const providerConfig: Record<string, string> = {};
		for (const f of def.fields) {
			const v = (d.providerConfig[f.key] ?? '').trim();
			providerConfig[f.key] = v || (f.secret && current.provider === d.provider ? (current.providerConfig[f.key] ?? '') : '');
		}
		try {
			def.create(providerConfig);
		} catch (err) {
			if (def.id !== 'none') return fail(400, { errors: { providerConfig: String((err as Error).message) }, message: (err as Error).message });
		}
		await saveSettings(event.locals.db, 'integrations', {
			provider: def.id,
			providerConfig,
			useProviderAvailability: d.useProviderAvailability,
			whatsappCloud: { ...d.whatsappCloud, accessToken: d.whatsappCloud.accessToken || current.whatsappCloud.accessToken },
			sms: { ...d.sms, authToken: d.sms.authToken || current.sms.authToken },
			corsOrigins: d.corsOrigins
		});
		await audit(event, 'update', 'settings', 'integrations', `Provider: ${def.id}`);
		return { ok: true };
	}
};

