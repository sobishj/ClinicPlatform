/**
 * Example adapter: a generic JSON-over-HTTPS bridge.
 *
 *   POST {baseUrl}/appointments            body: { change, appointment }      (syncAppointment)
 *   GET  {baseUrl}/availability?location=&doctor=&date=  → { slots: [{start,end,doctorId}] }
 *   POST {baseUrl}/patients                body: { name, phone, email }
 *
 * Every request carries `Authorization: Bearer {token}`. Copy this file to add a real
 * vendor adapter (map the payloads to the vendor's API) and register it in registry.ts.
 */
import type { IntegrationProvider } from '../registry.js';

export const GENERIC_HTTP_FIELDS = [
	{ key: 'baseUrl', label: 'Base URL', placeholder: 'https://bridge.example.com/clinic' },
	{ key: 'token', label: 'API token', secret: true }
];

export function genericHttpProvider(config: Record<string, string>): IntegrationProvider {
	const base = (config.baseUrl ?? '').replace(/\/$/, '');
	if (!/^https:\/\//.test(base)) throw new Error('generic-http: baseUrl must be an https URL');
	const headers = { 'content-type': 'application/json', authorization: `Bearer ${config.token ?? ''}` };
	const call = async (path: string, init: RequestInit = {}) => {
		const res = await fetch(base + path, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(10_000) });
		if (!res.ok) throw new Error(`generic-http ${path}: HTTP ${res.status}`);
		return res;
	};
	return {
		id: 'generic-http',
		label: 'Generic HTTP',
		async syncAppointment(appointment, change) {
			await call('/appointments', { method: 'POST', body: JSON.stringify({ change, appointment }) });
		},
		async fetchAvailability({ locationId, doctorId, date }) {
			const q = new URLSearchParams({ location: locationId, date });
			if (doctorId) q.set('doctor', doctorId);
			try {
				const data = (await (await call(`/availability?${q}`)).json()) as { slots?: Array<{ start: string; end: string; doctorId?: string }> };
				return Array.isArray(data.slots) ? data.slots : null;
			} catch (err) {
				console.error(err);
				return null; // fall back to local schedules
			}
		},
		async pushPatient(patient) {
			await call('/patients', { method: 'POST', body: JSON.stringify(patient) });
		}
	};
}
