import { describe, it, expect } from 'vitest';
import { availableDays, bookableRanges, intersect, slotsForDay, windowsFor, isSlotAvailable } from './availability.js';
import { zonedToUtc } from '../time.js';
import type { WeeklyHours } from '../types.js';

const TZ = 'Asia/Kolkata';
const split = [
	{ open: '09:30', close: '13:30' },
	{ open: '16:00', close: '20:00' }
];
const hours: WeeklyHours = { mon: split, tue: split, wed: split, thu: split, fri: split, sat: split };
const MON = '2026-11-16';
const at = (ymd: string, hhmm: string) => zonedToUtc(ymd, hhmm, TZ);

describe('bookableRanges', () => {
	it('uses branch hours when no doctor is chosen', () => {
		expect(bookableRanges(MON, { hours, closures: [] })).toEqual(split);
	});
	it('intersects with the doctor schedule', () => {
		const doctorSchedule: WeeklyHours = { mon: [{ open: '10:00', close: '12:00' }, { open: '17:00', close: '21:00' }] };
		expect(bookableRanges(MON, { hours, closures: [], doctorSchedule })).toEqual([
			{ open: '10:00', close: '12:00' },
			{ open: '17:00', close: '20:00' }
		]);
	});
	it('is empty on closures and doctor leave', () => {
		expect(bookableRanges(MON, { hours, closures: [{ startDate: MON, endDate: MON }] })).toEqual([]);
		expect(bookableRanges(MON, { hours, closures: [], doctorSchedule: { mon: split }, doctorLeaves: [{ startDate: '2026-11-15', endDate: '2026-11-17' }] })).toEqual([]);
	});
	it('intersect handles no overlap', () => {
		expect(intersect([{ open: '09:00', close: '10:00' }], [{ open: '10:00', close: '11:00' }])).toEqual([]);
	});
});

describe('windowsFor', () => {
	it('maps split hours onto morning and evening', () => {
		expect(windowsFor(split)).toEqual(['morning', 'afternoon', 'evening']);
		expect(windowsFor([{ open: '09:30', close: '11:30' }])).toEqual(['morning']);
	});
	it('drops windows that are already past', () => {
		expect(windowsFor(split, '17:00')).toEqual(['evening']);
		expect(windowsFor(split, '20:30')).toEqual([]);
	});
});

describe('availableDays', () => {
	it('skips closed days and respects minimum notice', () => {
		const days = availableDays({ hours, closures: [{ startDate: '2026-11-17', endDate: '2026-11-17' }] }, { tz: TZ, now: at('2026-11-14', '19:00'), maxDaysAhead: 4, minNoticeHours: 2 });
		// Sat 14 after 21:00 → nothing; Sun 15 closed; Mon 16 open; Tue 17 closure; Wed 18 open
		expect(days.map((d) => d.ymd)).toEqual(['2026-11-16', '2026-11-18']);
	});
});

describe('slotsForDay', () => {
	const ctx = { hours, closures: [], doctorSchedule: { mon: [{ open: '10:00', close: '12:00' }] } as WeeklyHours };
	const base = { tz: TZ, now: at('2026-11-10', '09:00'), slotMinutes: 30, minNoticeHours: 2, booked: [] as number[] };

	it('generates slots that fit inside the schedule', () => {
		const slots = slotsForDay(MON, ctx, base);
		expect(slots.map((s) => s.time)).toEqual(['10:00', '10:30', '11:00', '11:30']);
		expect(new Date(slots[0].start).toISOString()).toBe('2026-11-16T04:30:00.000Z');
	});

	it('removes booked slots (double-booking prevention)', () => {
		const slots = slotsForDay(MON, ctx, { ...base, booked: [at(MON, '10:30')] });
		expect(slots.map((s) => s.time)).toEqual(['10:00', '11:00', '11:30']);
		expect(isSlotAvailable(at(MON, '10:30'), MON, ctx, { ...base, booked: [at(MON, '10:30')] })).toBe(false);
		expect(isSlotAvailable(at(MON, '11:00'), MON, ctx, { ...base, booked: [at(MON, '10:30')] })).toBe(true);
	});

	it('honours longer service durations', () => {
		const slots = slotsForDay(MON, ctx, { ...base, durationMinutes: 60 });
		expect(slots.map((s) => s.time)).toEqual(['10:00', '10:30', '11:00']);
		// a 60-minute visit at 10:00 would overlap a booking at 10:30
		expect(slotsForDay(MON, ctx, { ...base, durationMinutes: 60, booked: [at(MON, '10:30')] }).map((s) => s.time)).toEqual(['11:00']);
	});

	it('respects minimum notice on the same day', () => {
		const slots = slotsForDay(MON, ctx, { ...base, now: at(MON, '08:45') });
		expect(slots[0].time).toBe('11:00');
	});

	it('rejects arbitrary times that are not on the grid', () => {
		expect(isSlotAvailable(at(MON, '10:10'), MON, ctx, base)).toBe(false);
	});
});
