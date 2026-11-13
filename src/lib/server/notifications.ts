import type { RequestEvent } from '@sveltejs/kit';
import { getEmailProvider } from './platform.js';
import { layout, table, button, esc } from './email/templates.js';
import { sendChannelNotifications } from './integrations/channels.js';
import { formatTime, zonedParts } from '../time.js';
import { TIME_WINDOWS, STATUS_LABELS, type AppointmentStatus } from '../types.js';
import { fullAddress, telLink } from '../format.js';
import type { AppointmentDetails } from './booking.js';
import type { Settings } from '../settings/schema.js';

export function describeWhen(d: AppointmentDetails, s: Settings): string {
	const date = new Intl.DateTimeFormat(s.clinic.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d.a.preferredDate + 'T00:00:00Z'));
	if (d.a.slotStart) return `${date}, ${formatTime(zonedParts(d.a.slotStart, s.clinic.timeZone).hhmm, s.clinic.locale)}`;
	const w = TIME_WINDOWS[d.a.timeWindow as keyof typeof TIME_WINDOWS];
	return w ? `${date} (${w.label.toLowerCase()})` : date;
}

const doctorLabel = (d: AppointmentDetails) => (d.doctor ? `${d.doctor.title ?? ''} ${d.doctor.name}`.trim() : 'No preference');

/**
 * Notify the branch and (optionally) the patient. Every channel is optional and failures are
 * logged, never thrown — the request is already saved.
 */
export async function notifyAppointment(event: Pick<RequestEvent, 'locals' | 'url'>, d: AppointmentDetails, kind: 'created' | 'status') {
	const s = event.locals.settings;
	const provider = await getEmailProvider(s);
	const tasks: Promise<unknown>[] = [];
	const when = describeWhen(d, s);
	const adminLink = `${event.url.origin}/admin/appointments/${d.a.id}`;

	if (provider && kind === 'created' && s.notifications.emailBranch) {
		const to = d.locationEmail || s.notifications.adminEmail || s.clinic.email;
		if (to)
			tasks.push(
				provider.send({
					to,
					replyTo: d.a.email || undefined,
					subject: `New appointment request ${d.a.reference} — ${d.locationName}`,
					html: layout(
						s,
						'New appointment request',
						`<p>Please call the patient to confirm.</p>` +
							table([
								['Reference', d.a.reference],
								['Patient', d.a.patientName],
								['Phone', d.a.phone],
								['Email', d.a.email],
								['Branch', d.locationName],
								['Doctor', doctorLabel(d)],
								['Service', d.service?.name],
								['When', when],
								['Notes', d.a.notes]
							]) +
							button(adminLink, 'Open in admin', s.theme.primary)
					),
					text: `New request ${d.a.reference}: ${d.a.patientName}, ${d.a.phone}, ${d.locationName}, ${when}. ${adminLink}`
				})
			);
	}

	if (provider && d.a.email && s.notifications.emailPatient) {
		const phone = d.locationPhones[0] ?? s.clinic.phones[0];
		const statusLine =
			kind === 'created'
				? `<p>Thank you, ${esc(d.a.patientName)}. We have received your request and will call you shortly to confirm the time.</p>`
				: `<p>Hello ${esc(d.a.patientName)}, your appointment status is now <strong>${esc(STATUS_LABELS[d.a.status as AppointmentStatus])}</strong>.</p>`;
		tasks.push(
			provider.send({
				to: d.a.email,
				subject: kind === 'created' ? `We received your request (${d.a.reference})` : `Your appointment ${d.a.reference}: ${STATUS_LABELS[d.a.status as AppointmentStatus]}`,
				html: layout(
					s,
					kind === 'created' ? 'Request received' : 'Appointment update',
					statusLine +
						table([
							['Reference', d.a.reference],
							['Branch', d.locationName],
							['Address', fullAddress({ addressLine1: d.address1, area: d.area, city: d.city })],
							['Doctor', d.doctor ? doctorLabel(d) : null],
							['When', when],
							['Phone', phone]
						]) +
						(d.directionsUrl ? button(d.directionsUrl, 'Get directions', s.theme.primary) : '') +
						(phone ? `<p style="font-size:13px;color:#6b7280">Need to change something? Call <a href="${telLink(phone)}">${esc(phone)}</a>.</p>` : '')
				)
			})
		);
	}

	tasks.push(sendChannelNotifications(s, d, kind, when));

	const results = await Promise.allSettled(tasks);
	for (const r of results) if (r.status === 'rejected') console.error('[notify]', r.reason);
}
