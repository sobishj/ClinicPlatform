/**
 * Pluggable notification channels beyond email (WhatsApp Business Cloud API, SMS).
 * Filled in during Phase 5; until then this is a no-op so the booking flow is already wired.
 */
import type { Settings } from '../../settings/schema.js';
import type { AppointmentDetails } from '../booking.js';

export async function sendChannelNotifications(_s: Settings, _d: AppointmentDetails, _kind: 'created' | 'status', _when: string): Promise<void> {}
