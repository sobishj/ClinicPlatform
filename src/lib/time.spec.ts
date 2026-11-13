import { describe, it, expect } from 'vitest';
import { zonedParts, zonedToUtc, weekdayOf, openStatus, summariseHours, addDays } from './time.js';
import type { WeeklyHours } from './types.js';

const IST = 'Asia/Kolkata';
const split = [
	{ open: '09:30', close: '13:30' },
	{ open: '16:00', close: '20:00' }
];
const hours: WeeklyHours = { mon: split, tue: split, wed: split, thu: split, fri: split, sat: split };

describe('zoned conversions', () => {
	it('converts IST local time to UTC and back', () => {
		const utc = zonedToUtc('2026-11-16', '10:00', IST);
		expect(new Date(utc).toISOString()).toBe('2026-11-16T04:30:00.000Z');
		expect(zonedParts(utc, IST).hhmm).toBe('10:00');
	});
	it('handles DST zones', () => {
		// New York: 2026-03-08 is DST start; 10:00 local = 14:00 UTC (EDT)
		expect(new Date(zonedToUtc('2026-03-09', '10:00', 'America/New_York')).toISOString()).toBe('2026-03-09T14:00:00.000Z');
		expect(new Date(zonedToUtc('2026-01-09', '10:00', 'America/New_York')).toISOString()).toBe('2026-01-09T15:00:00.000Z');
	});
	it('computes weekdays and adds days across months', () => {
		expect(weekdayOf('2026-11-16')).toBe('mon');
		expect(weekdayOf('2026-11-15')).toBe('sun');
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
	});
});

describe('openStatus', () => {
	const at = (ymd: string, hhmm: string) => zonedToUtc(ymd, hhmm, IST);
	it('is open during a session', () => {
		const s = openStatus(hours, [], IST, at('2026-11-16', '10:15'));
		expect(s.open).toBe(true);
		expect(s.label).toMatch(/until 1:30/i);
	});
	it('is closed in the lunch gap and says when it reopens', () => {
		const s = openStatus(hours, [], IST, at('2026-11-16', '14:00'));
		expect(s.open).toBe(false);
		expect(s.label).toMatch(/opens 4:00/i);
	});
	it('is closed on Sunday and opens Monday', () => {
		const s = openStatus(hours, [], IST, at('2026-11-15', '11:00'));
		expect(s.open).toBe(false);
		expect(s.label).toMatch(/tomorrow 9:30/i);
	});
	it('respects closures', () => {
		const s = openStatus(hours, [{ startDate: '2026-11-16', endDate: '2026-11-16', reason: 'Holiday' }], IST, at('2026-11-16', '10:15'));
		expect(s.open).toBe(false);
		expect(s.closureReason).toBe('Holiday');
	});
});

describe('summariseHours', () => {
	it('groups identical consecutive days', () => {
		const out = summariseHours(hours);
		expect(out).toHaveLength(2);
		expect(out[0].days).toBe('Mon–Sat');
		expect(out[1]).toEqual({ days: 'Sun', hours: 'Closed' });
	});
});
