import { eq } from 'drizzle-orm';
import * as env from '$app/env/private';
import type { DB } from './db/index.js';
import { settings as settingsTable } from './db/schema.js';
import {
	settingsSchemas,
	parseSettingsGroup,
	defaultSettings,
	SECRET_FIELDS,
	type Settings,
	type SettingsKey
} from '../settings/schema.js';

const VERSION_KEY = '_contentVersion';

export interface LoadedSettings {
	settings: Settings;
	/** Changes whenever content is edited; used as the page-cache key prefix. */
	version: string;
}

export async function loadSettings(db: DB): Promise<LoadedSettings> {
	const rows = await db.select().from(settingsTable);
	const out = defaultSettings();
	let version = '0';
	for (const row of rows) {
		if (row.key === VERSION_KEY) {
			version = String(row.value);
			continue;
		}
		if (row.key in settingsSchemas) {
			const key = row.key as SettingsKey;
			(out as Record<string, unknown>)[key] = parseSettingsGroup(key, row.value);
		}
	}
	applyEnvOverrides(out);
	return { settings: out, version };
}

/** Environment variables win over values saved in the admin panel. */
function applyEnvOverrides(s: Settings) {
	if (env.TURNSTILE_SITE_KEY) s.security.turnstileSiteKey = env.TURNSTILE_SITE_KEY;
	if (env.TURNSTILE_SECRET_KEY) s.security.turnstileSecretKey = env.TURNSTILE_SECRET_KEY;
	if (env.EMAIL_PROVIDER === 'resend' || env.EMAIL_PROVIDER === 'smtp' || env.EMAIL_PROVIDER === 'none')
		s.email.provider = env.EMAIL_PROVIDER;
	if (env.EMAIL_FROM) s.email.from = env.EMAIL_FROM;
	if (env.RESEND_API_KEY) s.email.resendApiKey = env.RESEND_API_KEY;
	if (env.SMTP_HOST) s.email.smtpHost = env.SMTP_HOST;
	if (env.SMTP_PORT) s.email.smtpPort = Number(env.SMTP_PORT) || 587;
	if (env.SMTP_USER) s.email.smtpUser = env.SMTP_USER;
	if (env.SMTP_PASS) s.email.smtpPass = env.SMTP_PASS;
	if (env.SMTP_SECURE) s.email.smtpSecure = env.SMTP_SECURE === 'true';
}

/** Which secret-ish values come from the environment (shown as "set via environment" in admin). */
export function envManaged(): Record<string, boolean> {
	return {
		'security.turnstileSiteKey': !!env.TURNSTILE_SITE_KEY,
		'security.turnstileSecretKey': !!env.TURNSTILE_SECRET_KEY,
		'email.provider': !!env.EMAIL_PROVIDER,
		'email.resendApiKey': !!env.RESEND_API_KEY,
		'email.smtpPass': !!env.SMTP_PASS
	};
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
	const parts = path.split('.');
	let o = obj;
	for (const p of parts.slice(0, -1)) {
		if (!o[p] || typeof o[p] !== 'object') o[p] = {};
		o = o[p] as Record<string, unknown>;
	}
	o[parts.at(-1)!] = value;
}

/**
 * Save a settings group. Secret fields submitted empty keep their stored value,
 * so forms never need to echo secrets back to the browser.
 */
export async function saveSettings<K extends SettingsKey>(
	db: DB,
	key: K,
	value: Settings[K]
): Promise<Settings[K]> {
	const parsed = settingsSchemas[key].parse(value) as Record<string, unknown>;
	const secrets = SECRET_FIELDS[key];
	if (secrets?.length) {
		const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).get();
		const stored = (existing?.value ?? {}) as Record<string, unknown>;
		for (const path of secrets) {
			const submitted = getPath(parsed, path);
			const isEmpty =
				submitted === '' ||
				submitted === undefined ||
				(typeof submitted === 'object' && submitted !== null && Object.keys(submitted).length === 0);
			if (isEmpty && getPath(stored, path) !== undefined) setPath(parsed, path, getPath(stored, path));
		}
	}
	await db
		.insert(settingsTable)
		.values({ key, value: parsed })
		.onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed, updatedAt: Date.now() } });
	await markContentChanged(db);
	return parsed as Settings[K];
}

/** Bump the content version so cached public pages and API reads are refreshed. */
export async function markContentChanged(db: DB) {
	const v = String(Date.now());
	await db
		.insert(settingsTable)
		.values({ key: VERSION_KEY, value: v })
		.onConflictDoUpdate({ target: settingsTable.key, set: { value: v, updatedAt: Date.now() } });
}

/** Remove secret fields before sending settings to any browser (public or admin). */
export function stripSecrets(s: Settings): Settings {
	const copy = structuredClone(s) as unknown as Record<string, Record<string, unknown>>;
	for (const [key, paths] of Object.entries(SECRET_FIELDS)) {
		for (const path of paths ?? []) {
			const current = getPath(copy[key], path);
			if (current === undefined) continue;
			setPath(copy[key], path, typeof current === 'object' ? {} : '');
		}
	}
	return copy as unknown as Settings;
}

/** For admin forms: which secret fields currently have a value (never the value itself). */
export function secretPresence(s: Settings): Record<string, boolean> {
	const out: Record<string, boolean> = {};
	for (const [key, paths] of Object.entries(SECRET_FIELDS)) {
		for (const path of paths ?? []) {
			const v = getPath((s as unknown as Record<string, Record<string, unknown>>)[key], path);
			out[`${key}.${path}`] = typeof v === 'object' && v ? Object.keys(v).length > 0 : !!v;
		}
	}
	return out;
}

/** The public subset needed to render the website. */
export function publicSettings(s: Settings) {
	return {
		clinic: s.clinic,
		theme: s.theme,
		labels: s.labels,
		modules: s.modules,
		homepage: s.homepage,
		hero: s.hero,
		banner: s.banner,
		disclaimer: s.disclaimer,
		booking: {
			mode: s.booking.mode,
			showServiceDropdown: s.booking.showServiceDropdown,
			requireEmail: s.booking.requireEmail,
			phonePattern: s.booking.phonePattern,
			phoneHint: s.booking.phoneHint,
			thankYouHeading: s.booking.thankYouHeading,
			thankYouMessage: s.booking.thankYouMessage,
			consentText: s.booking.consentText,
			maxDaysAhead: s.booking.maxDaysAhead,
			minNoticeHours: s.booking.minNoticeHours
		},
		seo: s.seo,
		analytics: s.analytics,
		turnstileSiteKey: s.security.turnstileSiteKey,
		chatbot: {
			provider: s.modules.chatbot ? s.chatbot.provider : 'none',
			title: s.chatbot.title,
			greeting: s.chatbot.greeting,
			buttonLabel: s.chatbot.buttonLabel,
			hasEndpoint: !!s.chatbot.endpointUrl
		}
	};
}
export type PublicSettings = ReturnType<typeof publicSettings>;
