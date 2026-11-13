/**
 * Integration providers connect the site to a clinic's existing software (practice
 * management system, CRM…) when that software has an API.
 *
 * To add a system: create `providers/<name>.ts` exporting a factory that returns an
 * IntegrationProvider, add it to PROVIDERS below, and choose it under
 * Admin → Integrations. Configuration values (URLs, tokens) are stored as secrets in
 * settings.integrations.providerConfig.
 */
import type { Settings } from '../../settings/schema.js';
import { genericHttpProvider, GENERIC_HTTP_FIELDS } from './providers/generic-http.js';

export interface ProviderSlot {
	start: string; // ISO
	end: string; // ISO
	doctorId?: string;
}

export interface IntegrationProvider {
	readonly id: string;
	readonly label: string;
	/** Push a new/changed appointment to the external system. */
	syncAppointment?(appointment: Record<string, unknown>, change: 'created' | 'updated' | 'cancelled'): Promise<void>;
	/** Return availability from the external system, or null to fall back to local schedules. */
	fetchAvailability?(opts: { locationId: string; doctorId?: string | null; date: string }): Promise<ProviderSlot[] | null>;
	/** Create/update the patient record. */
	pushPatient?(patient: { name: string; phone: string; email?: string | null }): Promise<void>;
	/** Send a free-text notification through the system (e.g. its SMS gateway). */
	sendNotification?(message: { to: string; text: string }): Promise<void>;
}

export interface ProviderDefinition {
	id: string;
	label: string;
	description: string;
	/** Config fields shown in the admin form. */
	fields: Array<{ key: string; label: string; secret?: boolean; placeholder?: string }>;
	create(config: Record<string, string>): IntegrationProvider;
}

export const noopProvider: IntegrationProvider = { id: 'none', label: 'None' };

export const PROVIDERS: ProviderDefinition[] = [
	{
		id: 'none',
		label: 'None',
		description: 'The website works on its own. Appointment requests stay in this admin panel.',
		fields: [],
		create: () => noopProvider
	},
	{
		id: 'generic-http',
		label: 'Generic HTTP (practice software bridge)',
		description:
			'Sends appointments to your system’s REST endpoint and can read availability from it. Works with most practice-management systems via a small bridge or iPaaS (Zapier, Make, n8n).',
		fields: GENERIC_HTTP_FIELDS,
		create: genericHttpProvider
	}
];

export function providerDefinition(id: string) {
	return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export async function getIntegrationProvider(s: Settings): Promise<IntegrationProvider> {
	const def = providerDefinition(s.integrations.provider);
	try {
		return def.create(s.integrations.providerConfig ?? {});
	} catch (err) {
		console.error('[integrations] provider misconfigured', err);
		return noopProvider;
	}
}
