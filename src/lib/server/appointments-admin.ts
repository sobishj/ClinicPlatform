import { and, desc, asc, eq, gte, inArray, like, lte, or, sql, type SQL } from 'drizzle-orm';
import type { DB } from './db/index.js';
import { appointments, locations, doctors, services } from './db/schema.js';
import { locationScope } from '../permissions.js';
import { APPOINTMENT_STATUSES, type AppointmentStatus, type SessionUser } from '../types.js';

export interface AppointmentFilters {
	locationId?: string;
	doctorId?: string;
	status?: string;
	from?: string;
	to?: string;
	q?: string;
}

export function filtersFromUrl(url: URL): AppointmentFilters {
	const g = (k: string) => url.searchParams.get(k)?.trim() || undefined;
	return { locationId: g('location'), doctorId: g('doctor'), status: g('status'), from: g('from'), to: g('to'), q: g('q') };
}

/** WHERE clause for appointment lists, always including the user's branch scope. */
export function appointmentWhere(user: SessionUser, f: AppointmentFilters): SQL | undefined {
	const conds: SQL[] = [];
	const scope = locationScope(user);
	if (scope) conds.push(scope.length ? inArray(appointments.locationId, scope) : sql`0`);
	if (f.locationId) conds.push(eq(appointments.locationId, f.locationId));
	if (f.doctorId) conds.push(f.doctorId === 'none' ? sql`${appointments.doctorId} IS NULL` : eq(appointments.doctorId, f.doctorId));
	if (f.status && (APPOINTMENT_STATUSES as string[]).includes(f.status)) conds.push(eq(appointments.status, f.status as AppointmentStatus));
	if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) conds.push(gte(appointments.preferredDate, f.from));
	if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) conds.push(lte(appointments.preferredDate, f.to));
	if (f.q) {
		const q = `%${f.q}%`;
		const digits = f.q.replace(/\D/g, '');
		conds.push(
			or(
				like(appointments.patientName, q),
				like(appointments.reference, q.toUpperCase()),
				like(appointments.email, q),
				like(appointments.phone, q),
				digits.length >= 4 ? like(sql`REPLACE(REPLACE(REPLACE(${appointments.phone}, ' ', ''), '-', ''), '+', '')`, `%${digits}%`) : sql`0`
			)!
		);
	}
	return conds.length ? and(...conds) : undefined;
}

const listColumns = {
	id: appointments.id,
	reference: appointments.reference,
	status: appointments.status,
	source: appointments.source,
	preferredDate: appointments.preferredDate,
	timeWindow: appointments.timeWindow,
	slotStart: appointments.slotStart,
	patientName: appointments.patientName,
	phone: appointments.phone,
	email: appointments.email,
	notes: appointments.notes,
	createdAt: appointments.createdAt,
	locationId: appointments.locationId,
	locationName: locations.name,
	doctorTitle: doctors.title,
	doctorName: doctors.name,
	serviceName: services.name
};

export async function listAppointments(db: DB, where: SQL | undefined, opts: { page?: number; perPage?: number; order?: 'created' | 'date' } = {}) {
	const perPage = opts.perPage ?? 30;
	const page = Math.max(1, opts.page ?? 1);
	const rows = await db
		.select(listColumns)
		.from(appointments)
		.innerJoin(locations, eq(locations.id, appointments.locationId))
		.leftJoin(doctors, eq(doctors.id, appointments.doctorId))
		.leftJoin(services, eq(services.id, appointments.serviceId))
		.where(where)
		.orderBy(...(opts.order === 'date' ? [asc(appointments.preferredDate), asc(appointments.slotStart)] : [desc(appointments.createdAt)]))
		.limit(perPage + 1)
		.offset((page - 1) * perPage);
	return { items: rows.slice(0, perPage), hasMore: rows.length > perPage, page };
}

export async function statusCounts(db: DB, user: SessionUser) {
	const rows = await db
		.select({ status: appointments.status, n: sql<number>`COUNT(*)` })
		.from(appointments)
		.where(appointmentWhere(user, {}))
		.groupBy(appointments.status);
	return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<AppointmentStatus, number>>;
}

/** CSV with a UTF-8 BOM so Excel opens Indian-language names correctly. Formula-injection safe. */
export function toCsv(rows: Array<Record<string, unknown>>, columns: Array<[string, string]>): string {
	const cell = (v: unknown) => {
		let s = v == null ? '' : String(v);
		if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
		return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const lines = [columns.map(([, label]) => cell(label)).join(','), ...rows.map((r) => columns.map(([k]) => cell(r[k])).join(','))];
	return '﻿' + lines.join('\r\n') + '\r\n';
}
