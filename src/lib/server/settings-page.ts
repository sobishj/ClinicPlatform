import type { RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from './auth.js';
import { saveSettings, stripSecrets, secretPresence, envManaged } from './settings.js';
import { parsePayload } from './forms.js';
import { audit } from './audit.js';
import { settingsSchemas, CONTENT_SETTINGS, type Settings, type SettingsKey } from '../settings/schema.js';

function permissionFor(keys: SettingsKey[]) {
	return keys.every((k) => CONTENT_SETTINGS.includes(k)) ? 'content:write' : 'settings:manage';
}

/** Load settings groups for an admin form (secrets removed, presence flags included). */
export function loadGroups<K extends SettingsKey>(event: Pick<RequestEvent, 'locals' | 'url'>, keys: K[]) {
	requirePermission(event, permissionFor(keys));
	const safe = stripSecrets(event.locals.settings);
	const values = Object.fromEntries(keys.map((k) => [k, safe[k]])) as Pick<Settings, K>;
	return { values, secrets: secretPresence(event.locals.settings), envManaged: envManaged() };
}

/** Save settings groups posted by AdminForm as { [key]: value }. */
export async function saveGroups<K extends SettingsKey>(event: RequestEvent, keys: K[]) {
	requirePermission(event, permissionFor(keys));
	const schema = z.object(Object.fromEntries(keys.map((k) => [k, settingsSchemas[k]])) as unknown as Record<K, z.ZodType>);
	const parsed = await parsePayload(event.request, schema);
	if (!parsed.ok) return parsed.failure;
	for (const k of keys) {
		await saveSettings(event.locals.db, k, (parsed.data as Record<K, Settings[K]>)[k]);
	}
	await audit(event, 'update', 'settings', keys.join(','), `Updated ${keys.join(', ')} settings`);
	return { ok: true };
}
