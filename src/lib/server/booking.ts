/**
 * Appointment booking service: everything the booking page, staff "add by phone" and the
 * public API share. Validation here is authoritative; the browser only gives hints.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, gte, inArray, isNotNull, lte, ne } from 'drizzle-orm';
import type { DB } from './db/index.js';
import { locations, doctors, doctorLocations, doctorLeaves, services, serviceLocations, appointments } from './db/schema.js';
import { listLocations } from './queries.js';
import { availableDays, bookableRanges, slotsForDay, windowsFor, type DayContext } from '../booking/availability.js';
import { zonedParts } from '../time.js';
import { randomToken } from './crypto.js';
import type { Settings } from '../settings/schema.js';
import type { BookingInput } from '../schemas/booking.js';
import type { WeeklyHours } from '../types.js';
import { notifyAppointment } from './notifications.js';
import { emitEvent } from './integrations/events.js';
import { getIntegrationProvider } from './integrations/registry.js';
import { background } from './platform.js';

export type BookingMode = 'request' | 'slots';

export function locationMode(loc: { bookingMode: string }, s: Settings): BookingMode {
	return loc.bookingMode === 'request' || loc.bookingMode === 'slots' ? loc.bookingMode : s.booking.mode;
}

/** Everything the booking page needs, in one round of queries. */
export async function bookingContext(db: DB, s: Settings) {
	const locs = await listLocations(db);
	const ids = locs.map((l) => l.id);
	const [docRows, links, leaves, svc, svcLocs] = await Promise.all([
		db.select({ id: doctors.id, slug: doctors.slug, title: doctors.title, name: doctors.name, photo: doctors.photo, specialities: doctors.specialities }).from(doctors).where(eq(doctors.active, true)).orderBy(asc(doctors.sortOrder)),
		ids.length ? db.select().from(doctorLocations).where(and(inArray(doctorLocations.locationId, ids), eq(doctorLocations.bookable, true))) : [],
		db.select().from(doctorLeaves).where(gte(doctorLeaves.endDate, new Date().toISOString().slice(0, 10))),
		s.booking.showServiceDropdown
			? db.select({ id: services.id, slug: services.slug, name: services.name, category: services.category, durationMinutes: services.durationMinutes }).from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder))
			: Promise.resolve([] as Array<{ id: string; slug: string; name: string; category: string | null; durationMinutes: number | null }>),
		db.select().from(serviceLocations)
	]);
	return {
		locations: locs.map((l) => ({
			id: l.id,
			slug: l.slug,
			name: l.name,
			type: l.type,
			addressLine1: l.addressLine1,
			addressLine2: l.addressLine2,
			area: l.area,
			city: l.city,
			state: l.state,
			postalCode: l.postalCode,
			phones: l.phones,
			whatsapp: l.whatsapp,
			hours: l.hours,
			closures: l.closures,
			photo: l.photos[0] ?? null,
			mode: locationMode(l, s),
			directionsUrl: l.directionsUrl
		})),
		doctors: docRows
			.map((d) => ({
				...d,
				branches: links.filter((x) => x.doctorId === d.id).map((x) => ({ locationId: x.locationId, schedule: x.schedule })),
				leaves: leaves.filter((x) => x.doctorId === d.id).map(({ startDate, endDate }) => ({ startDate, endDate }))
			}))
			.filter((d) => d.branches.length),
		services: svc.map((x) => ({ ...x, locationIds: svcLocs.filter((sl) => sl.serviceId === x.id).map((sl) => sl.locationId) }))
	};
}
export type BookingContext = Awaited<ReturnType<typeof bookingContext>>;

async function dayContext(db: DB, locationId: string, doctorId: string | null): Promise<{ ctx: DayContext; location: typeof locations.$inferSelect } | null> {
	const [loc] = (await listLocations(db)).filter((l) => l.id === locationId);
	if (!loc) return null;
	let doctorSchedule: WeeklyHours | null = null;
	let doctorLeavesList: Array<{ startDate: string; endDate: string }> = [];
	if (doctorId) {
		const link = await db
			.select({ schedule: doctorLocations.schedule })
			.from(doctorLocations)
			.innerJoin(doctors, eq(doctors.id, doctorLocations.doctorId))
			.where(and(eq(doctorLocations.doctorId, doctorId), eq(doctorLocations.locationId, locationId), eq(doctorLocations.bookable, true), eq(doctors.active, true)))
			.get();
		if (!link) return null;
		doctorSchedule = link.schedule;
		doctorLeavesList = await db.select({ startDate: doctorLeaves.startDate, endDate: doctorLeaves.endDate }).from(doctorLeaves).where(eq(doctorLeaves.doctorId, doctorId));
	}
	return { ctx: { hours: loc.hours, closures: loc.closures, doctorSchedule, doctorLeaves: doctorLeavesList }, location: loc };
}

async function bookedStarts(db: DB, doctorId: string, ymd: string) {
	const rows = await db
		.select({ slotStart: appointments.slotStart })
		.from(appointments)
		.where(and(eq(appointments.doctorId, doctorId), eq(appointments.preferredDate, ymd), isNotNull(appointments.slotStart), ne(appointments.status, 'cancelled')));
	return rows.map((r) => r.slotStart!).filter(Boolean);
}

/** Live slots for a date. With no doctor chosen, merges slots across all bookable doctors. */
export async function getSlots(db: DB, s: Settings, opts: { locationId: string; doctorId?: string | null; date: string; serviceId?: string | null }) {
	const duration = opts.serviceId ? (await db.select({ d: services.durationMinutes }).from(services).where(eq(services.id, opts.serviceId)).get())?.d : null;
	const doctorIds = opts.doctorId
		? [opts.doctorId]
		: (await db.select({ id: doctorLocations.doctorId }).from(doctorLocations).innerJoin(doctors, eq(doctors.id, doctorLocations.doctorId)).where(and(eq(doctorLocations.locationId, opts.locationId), eq(doctorLocations.bookable, true), eq(doctors.active, true)))).map((r) => r.id);
	const byStart = new Map<number, { start: number; end: number; time: string; doctorIds: string[] }>();
	for (const id of doctorIds) {
		const dc = await dayContext(db, opts.locationId, id);
		if (!dc) continue;
		const slots = slotsForDay(opts.date, dc.ctx, {
			tz: s.clinic.timeZone,
			now: Date.now(),
			slotMinutes: s.booking.slotMinutes,
			durationMinutes: duration ?? undefined,
			minNoticeHours: s.booking.minNoticeHours,
			booked: await bookedStarts(db, id, opts.date)
		});
		for (const sl of slots) {
			const e = byStart.get(sl.start);
			if (e) e.doctorIds.push(id);
			else byStart.set(sl.start, { ...sl, doctorIds: [id] });
		}
	}
	return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** Dates (and windows) for request mode — exposed to the public API as availability. */
export async function getAvailableDays(db: DB, s: Settings, opts: { locationId: string; doctorId?: string | null }) {
	const dc = await dayContext(db, opts.locationId, opts.doctorId ?? null);
	if (!dc) return [];
	return availableDays(dc.ctx, { tz: s.clinic.timeZone, now: Date.now(), maxDaysAhead: s.booking.maxDaysAhead, minNoticeHours: s.booking.minNoticeHours });
}

export class BookingError extends Error {
	constructor(
		message: string,
		public field: string = '_form',
		public status = 400
	) {
		super(message);
	}
}

function makeReference(s: Settings): string {
	const prefix = (s.clinic.shortName || s.clinic.name)
		.split(/\s+/)
		.map((w) => w[0])
		.join('')
		.replace(/[^A-Za-z]/g, '')
		.toUpperCase()
		.slice(0, 3) || 'APT';
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	return `${prefix}-${[...bytes].map((b) => alphabet[b % alphabet.length]).join('')}`;
}

export interface CreateOptions {
	source: 'web' | 'phone' | 'api' | 'chatbot';
	/** Staff can book outside the online window (e.g. today without notice, past corrections). */
	staffOverride?: boolean;
}

/**
 * Validate business rules and insert. Throws BookingError with a field name for the form.
 */
export async function createAppointment(event: Pick<RequestEvent, 'locals' | 'platform' | 'url'>, input: BookingInput, opts: CreateOptions) {
	const db = event.locals.db;
	const s = event.locals.settings;
	if (!s.modules.booking && opts.source !== 'phone') throw new BookingError('Online booking is not available.', '_form', 403);

	const doctorId = input.doctorId || null;
	const dc = await dayContext(db, input.locationId, doctorId);
	if (!dc) throw new BookingError(doctorId ? 'That doctor is not available at this branch.' : 'Please choose a branch.', doctorId ? 'doctorId' : 'locationId');
	const loc = dc.location;

	if (input.serviceId) {
		const offered = await db.select().from(serviceLocations).where(and(eq(serviceLocations.serviceId, input.serviceId), eq(serviceLocations.locationId, loc.id))).get();
		const svc = await db.select({ id: services.id }).from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).get();
		if (!svc || !offered) throw new BookingError('That service is not offered at this branch.', 'serviceId');
	}

	const tz = s.clinic.timeZone;
	const mode = locationMode(loc, s);
	let slotStart: number | null = null;
	let slotEnd: number | null = null;
	let assignedDoctor = doctorId;

	if (!opts.staffOverride) {
		const today = zonedParts(Date.now(), tz).ymd;
		const last = zonedParts(Date.now() + s.booking.maxDaysAhead * 86400_000, tz).ymd;
		if (input.date < today || input.date > last) throw new BookingError('Please choose a date within the booking window.', 'date');
	}

	if (input.timeWindow === 'slot') {
		if (mode !== 'slots' && !opts.staffOverride) throw new BookingError('Please choose a time of day.', 'timeWindow');
		const wanted = Number(input.slot);
		const slots = await getSlots(db, s, { locationId: loc.id, doctorId, date: input.date, serviceId: input.serviceId || null });
		const match = slots.find((x) => x.start === wanted);
		if (!match) throw new BookingError('Sorry, that time has just been taken. Please choose another.', 'slot', 409);
		slotStart = match.start;
		slotEnd = match.end;
		assignedDoctor = doctorId ?? match.doctorIds[0];
	} else {
		if (mode === 'slots' && opts.source === 'web') throw new BookingError('Please choose a time.', 'slot');
		if (!opts.staffOverride) {
			const ranges = bookableRanges(input.date, dc.ctx);
			const p = zonedParts(Date.now() + s.booking.minNoticeHours * 3600_000, tz);
			const windows = windowsFor(ranges, input.date === p.ymd ? p.hhmm : undefined);
			if (input.date < p.ymd || !windows.includes(input.timeWindow)) {
				throw new BookingError(ranges.length ? 'That time of day is not available on this date.' : 'The branch is closed on that date. Please choose another day.', ranges.length ? 'timeWindow' : 'date');
			}
		}
	}

	// Insert (retry on the rare reference collision). The partial unique index rejects a
	// concurrent booking of the same doctor + slot.
	for (let attempt = 0; attempt < 3; attempt++) {
		const row = {
			id: crypto.randomUUID(),
			reference: makeReference(s),
			locationId: loc.id,
			doctorId: assignedDoctor,
			serviceId: input.serviceId || null,
			preferredDate: input.date,
			timeWindow: input.timeWindow,
			slotStart,
			slotEnd,
			patientName: input.name,
			phone: input.phone,
			email: input.email || null,
			notes: input.notes || null,
			consentAt: Date.now(),
			status: 'new' as const,
			source: opts.source
		};
		try {
			await db.insert(appointments).values(row);
			background(event.platform, afterCreate(event, row.id));
			return row;
		} catch (err) {
			const msg = String((err as { cause?: { message?: string }; message?: string })?.cause?.message ?? (err as Error)?.message ?? err);
			if (/appt_doctor_slot_uq|doctor_id, appointments\.slot_start/.test(msg)) {
				throw new BookingError('Sorry, that time has just been taken. Please choose another.', 'slot', 409);
			}
			if (/reference/.test(msg) && attempt < 2) continue;
			throw err;
		}
	}
	throw new BookingError('Could not save the request. Please try again.');
}

/** Load an appointment with names for notifications, the API and webhooks. */
export async function appointmentDetails(db: DB, id: string) {
	const row = await db
		.select({
			a: appointments,
			locationName: locations.name,
			locationSlug: locations.slug,
			locationPhones: locations.phones,
			locationWhatsapp: locations.whatsapp,
			locationEmail: locations.notificationEmail,
			directionsUrl: locations.directionsUrl,
			address1: locations.addressLine1,
			area: locations.area,
			city: locations.city
		})
		.from(appointments)
		.innerJoin(locations, eq(locations.id, appointments.locationId))
		.where(eq(appointments.id, id))
		.get();
	if (!row) return null;
	const [doc, svc] = await Promise.all([
		row.a.doctorId ? db.select({ title: doctors.title, name: doctors.name, slug: doctors.slug }).from(doctors).where(eq(doctors.id, row.a.doctorId)).get() : null,
		row.a.serviceId ? db.select({ name: services.name, slug: services.slug }).from(services).where(eq(services.id, row.a.serviceId)).get() : null
	]);
	return { ...row, doctor: doc ?? null, service: svc ?? null };
}
export type AppointmentDetails = NonNullable<Awaited<ReturnType<typeof appointmentDetails>>>;

/** Public, non-personal view of an appointment (for webhooks/API payloads). */
export function appointmentPayload(d: AppointmentDetails) {
	const a = d.a;
	return {
		id: a.id,
		reference: a.reference,
		status: a.status,
		source: a.source,
		location: { id: a.locationId, slug: d.locationSlug, name: d.locationName },
		doctor: a.doctorId ? { id: a.doctorId, slug: d.doctor?.slug, name: d.doctor ? `${d.doctor.title ?? ''} ${d.doctor.name}`.trim() : null } : null,
		service: a.serviceId ? { id: a.serviceId, slug: d.service?.slug, name: d.service?.name } : null,
		preferredDate: a.preferredDate,
		timeWindow: a.timeWindow,
		slotStart: a.slotStart ? new Date(a.slotStart).toISOString() : null,
		slotEnd: a.slotEnd ? new Date(a.slotEnd).toISOString() : null,
		patient: { name: a.patientName, phone: a.phone, email: a.email },
		notes: a.notes,
		createdAt: new Date(a.createdAt).toISOString(),
		updatedAt: new Date(a.updatedAt).toISOString()
	};
}

async function afterCreate(event: Pick<RequestEvent, 'locals' | 'platform' | 'url'>, id: string) {
	const details = await appointmentDetails(event.locals.db, id);
	if (!details) return;
	await Promise.allSettled([
		notifyAppointment(event, details, 'created'),
		emitEvent(event, 'appointment.created', appointmentPayload(details)),
		getIntegrationProvider(event.locals.settings).then((p) => p.syncAppointment?.(appointmentPayload(details), 'created'))
	]);
}

/** Appointments in a date range (admin calendar/export helpers). */
export async function appointmentsBetween(db: DB, from: string, to: string) {
	return db.select().from(appointments).where(and(gte(appointments.preferredDate, from), lte(appointments.preferredDate, to)));
}
