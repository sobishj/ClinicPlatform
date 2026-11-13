/**
 * The only module feature code uses to reach platform services.
 * `#target` resolves to target/node.ts or target/cloudflare.ts at build time.
 */
import * as target from '#target';
import type { Storage } from './storage/types.js';
import type { EmailProvider, ResolvedEmailConfig } from './email/types.js';
import { resendProvider } from './email/resend.js';
import type { Settings } from '../settings/schema.js';
import { MEDIA_PUBLIC_BASE_URL } from '$app/env/private';

export const TARGET: 'node' | 'cloudflare' = target.TARGET;
export const getDb = target.getDb;
export const cacheGet = target.cacheGet;
export const cachePut = target.cachePut;

export function getStorage(platform?: App.Platform): Storage {
	return target.getStorage(platform);
}

/** Run work after the response is sent (Workers: ctx.waitUntil; Node: fire-and-forget). */
export function background(platform: App.Platform | undefined, promise: Promise<unknown>) {
	target.waitUntil(platform, promise);
}

/** Public URL for a stored media key. */
export function mediaUrl(key: string): string {
	const base = (MEDIA_PUBLIC_BASE_URL ?? '/media').replace(/\/$/, '');
	return `${base}/${key}`;
}

export function resolveEmailConfig(s: Settings): ResolvedEmailConfig {
	const e = s.email;
	return {
		provider: e.provider,
		from: e.from || `${s.clinic.name} <no-reply@example.com>`,
		replyTo: e.replyTo || s.clinic.email || undefined,
		resendApiKey: e.resendApiKey || undefined,
		smtp: e.smtpHost
			? { host: e.smtpHost, port: e.smtpPort, user: e.smtpUser, pass: e.smtpPass, secure: e.smtpSecure }
			: undefined
	};
}

/** Returns null when no email provider is configured — callers must handle that. */
export async function getEmailProvider(s: Settings): Promise<EmailProvider | null> {
	const cfg = resolveEmailConfig(s);
	if (cfg.provider === 'resend' && cfg.resendApiKey) return resendProvider(cfg.resendApiKey, cfg.from, cfg.replyTo);
	if (cfg.provider === 'smtp') return target.getSmtpProvider(cfg);
	return null;
}
