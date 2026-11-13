/**
 * Pure availability logic shared by the booking page, the server and the public API.
 * No database access here — callers pass the schedules, closures and existing bookings.
 */
import { TIME_WINDOWS, type TimeRange, type WeeklyHours } from '../types.js';
import { addDays, rangesFor, zonedParts, zonedToUtc, isClosedOn, type DateRange } from '../time.js';

export type WindowKey = keyof typeof TIME_WINDOWS;
export const WINDOW_KEYS = Object.keys(TIME_WINDOWS) as WindowKey[];

export interface DayContext {
	/** Branch opening hours. */
	hours: WeeklyHours;
	closures: DateRange[];
	/** Doctor's schedule at this branch (when a doctor is chosen). */
	doctorSchedule?: WeeklyHours | null;
	doctorLeaves?: DateRange[];
}

/** The time ranges when the visit can happen on a date (branch hours ∩ doctor schedule). */
export function bookableRanges(ymd: string, ctx: DayContext): TimeRange[] {
	const branch = rangesFor(ctx.hours, ymd, ctx.closures);
	if (!ctx.doctorSchedule) return branch;
	if (ctx.doctorLeaves && isClosedOn(ymd, ctx.doctorLeaves)) return [];
	const doc = rangesFor(ctx.doctorSchedule, ymd);
	// Doctors without a schedule at this branch are "by appointment": fall back to branch hours.
	if (!Object.values(ctx.doctorSchedule).some((r) => r?.length)) return branch;
	return intersect(branch, doc);
}

export function intersect(a: TimeRange[], b: TimeRange[]): TimeRange[] {
	const out: TimeRange[] = [];
	for (const x of a)
		for (const y of b) {
			const open = x.open > y.open ? x.open : y.open;
			const close = x.close < y.close ? x.close : y.close;
			if (open < close) out.push({ open, close });
		}
	return out.sort((p, q) => p.open.localeCompare(q.open));
}

/** Which of morning / afternoon / evening overlap the bookable ranges. */
export function windowsFor(ranges: TimeRange[], afterHhmm?: string): WindowKey[] {
	return WINDOW_KEYS.filter((k) => {
		const w = TIME_WINDOWS[k];
		return ranges.some((r) => {
			const open = afterHhmm && afterHhmm > r.open ? afterHhmm : r.open;
			return open < w.to && r.close > w.from && open < r.close;
		});
	});
}

export interface DayOption {
	ymd: string;
	windows: WindowKey[];
}

/**
 * Upcoming dates that can be requested, with the time-of-day windows available on each.
 * `now` and `minNoticeHours` remove windows that are already past.
 */
export function availableDays(ctx: DayContext, opts: { tz: string; now: number; maxDaysAhead: number; minNoticeHours: number }): DayOption[] {
	const earliest = zonedParts(opts.now + opts.minNoticeHours * 3600_000, opts.tz);
	const start = zonedParts(opts.now, opts.tz).ymd;
	const out: DayOption[] = [];
	for (let i = 0; i <= opts.maxDaysAhead; i++) {
		const ymd = addDays(start, i);
		if (ymd < earliest.ymd) continue;
		const ranges = bookableRanges(ymd, ctx);
		const windows = windowsFor(ranges, ymd === earliest.ymd ? earliest.hhmm : undefined);
		if (windows.length) out.push({ ymd, windows });
	}
	return out;
}

export interface Slot {
	/** UTC ms */
	start: number;
	end: number;
	/** Clinic-local HH:MM */
	time: string;
}

/**
 * Live time slots for one doctor on one date. Slots must fit entirely inside a bookable range,
 * respect minimum notice, and not collide with existing bookings (UTC start times).
 */
export function slotsForDay(
	ymd: string,
	ctx: DayContext,
	opts: { tz: string; now: number; slotMinutes: number; durationMinutes?: number; minNoticeHours: number; booked: number[] }
): Slot[] {
	const step = opts.slotMinutes;
	const length = opts.durationMinutes ?? step;
	const earliest = opts.now + opts.minNoticeHours * 3600_000;
	const booked = new Set(opts.booked);
	const slots: Slot[] = [];
	for (const r of bookableRanges(ymd, ctx)) {
		const rangeStart = zonedToUtc(ymd, r.open, opts.tz);
		const rangeEnd = zonedToUtc(ymd, r.close, opts.tz);
		for (let t = rangeStart; t + length * 60_000 <= rangeEnd; t += step * 60_000) {
			if (t < earliest) continue;
			const end = t + length * 60_000;
			// Overlap check against existing bookings that start inside this slot.
			let clash = false;
			for (const b of booked) if (b >= t && b < end) clash = true;
			if (clash) continue;
			slots.push({ start: t, end, time: zonedParts(t, opts.tz).hhmm });
		}
	}
	return slots;
}

/** Is a requested slot still valid? (Used to re-check on submit before inserting.) */
export function isSlotAvailable(slotStart: number, ymd: string, ctx: DayContext, opts: Parameters<typeof slotsForDay>[2]): boolean {
	return slotsForDay(ymd, ctx, opts).some((s) => s.start === slotStart);
}
