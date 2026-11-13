/**
 * Integration providers connect the site to a clinic's existing software (practice management,
 * CRM…). Adding a system = adding one adapter file and registering it here (see Phase 5).
 */
import type { Settings } from '../../settings/schema.js';

export interface IntegrationProvider {
	readonly id: string;
	readonly label: string;
	syncAppointment?(appointment: Record<string, unknown>, change: 'created' | 'updated' | 'cancelled'): Promise<void>;
	fetchAvailability?(opts: { locationId: string; doctorId?: string | null; date: string }): Promise<Array<{ start: string; end: string; doctorId?: string }> | null>;
	pushPatient?(patient: { name: string; phone: string; email?: string | null }): Promise<void>;
	sendNotification?(message: { to: string; text: string }): Promise<void>;
}

export const noopProvider: IntegrationProvider = { id: 'none', label: 'None' };

export async function getIntegrationProvider(_s: Settings): Promise<IntegrationProvider> {
	return noopProvider;
}
