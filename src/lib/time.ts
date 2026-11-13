/**
 * Time-zone helpers built on Intl only (works on Workers, Node and browsers).
 * All clinic hours are stored as clinic-local "HH:MM"; instants are UTC milliseconds.
 */
import { WEEKDAYS, type TimeRange, type Weekday, type WeeklyHours } from './types.js';

export interface ZonedParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	weekday: Weekday;
	/** YYYY-MM-DD */
	ymd: string;
	/** HH:MM */
	hhmm: string;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
	let f = fmtCache.get(tz);
	if (!f) {
		f = new Intl.DateTimeFormat('en-GB', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			weekday: 'short',
			hourCycle: 'h23'
		});
		fmtCache.set(tz, f);
	}
	return f;
}

const WD: Record<string, Weekday> = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };

export function zonedParts(instant: number | Date, tz: string): ZonedParts {
	const parts = Object.fromEntries(formatter(tz).formatToParts(instant).map((p) => [p.type, p.value]));
	const year = Number(parts.year);
	const month = Number(parts.month);
	const day = Number(parts.day);
	const hour = Number(parts.hour) % 24;
	const minute = Number(parts.minute);
	const pad = (n: number) => String(n).padStart(2, '0');
	return {
		year,
		month,
		day,
		hour,
		minute,
		weekday: WD[parts.weekday] ?? 'mon',
		ymd: `${year}-${pad(month)}-${pad(day)}`,
		hhmm: `${pad(hour)}:${pad(minute)}`
	};
}

/** Clinic-local date + time → UTC milliseconds (handles DST by iterating on the offset). */
export function zonedToUtc(ymd: string, hhmm: string, tz: string): number {
	const [y, m, d] = ymd.split('-').map(Number);
	const [hh, mm] = hhmm.split(':').map(Number);
	const target = Date.UTC(y, m - 1, d, hh, mm);
	let guess = target;
	for (let i = 0; i < 3; i++) {
		const p = zonedParts(guess, tz);
		const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
		const diff = asUtc - target;
		if (diff === 0) break;
		guess -= diff;
	}
	return guess;
}

/** Weekday of a YYYY-MM-DD calendar date (time-zone independent). */
export function weekdayOf(ymd: string): Weekday {
	const [y, m, d] = ymd.split('-').map(Number);
	const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
	return WEEKDAYS[(js + 6) % 7];
}

export function addDays(ymd: string, n: number): string {
	const [y, m, d] = ymd.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export interface DateRange {
	startDate: string;
	endDate: string;
	reason?: string | null;
}

export function isClosedOn(ymd: string, closures: DateRange[]): DateRange | undefined {
	return closures.find((c) => c.startDate <= ymd && ymd <= c.endDate);
}

export function rangesFor(hours: WeeklyHours, ymd: string, closures: DateRange[] = []): TimeRange[] {
	if (isClosedOn(ymd, closures)) return [];
	return [...(hours[weekdayOf(ymd)] ?? [])].sort((a, b) => a.open.localeCompare(b.open));
}

/** "16:00" → "4:00 pm" (or 24h when the locale prefers it). */
export function formatTime(hhmm: string, locale = 'en-IN'): string {
	const [h, m] = hhmm.split(':').map(Number);
	return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 1, h, m));
}

export function formatRanges(ranges: TimeRange[] | undefined, locale = 'en-IN'): string {
	if (!ranges?.length) return 'Closed';
	return ranges.map((r) => `${formatTime(r.open, locale)} – ${formatTime(r.close, locale)}`).join(', ');
}

export interface OpenStatus {
	open: boolean;
	/** e.g. "Open now · until 1:30 pm" / "Closed · opens tomorrow 9:30 am" */
	label: string;
	closureReason?: string | null;
}

const DAY_NAMES: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export function openStatus(hours: WeeklyHours, closures: DateRange[], tz: string, now: number = Date.now(), locale = 'en-IN'): OpenStatus {
	const p = zonedParts(now, tz);
	const closure = isClosedOn(p.ymd, closures);
	const today = rangesFor(hours, p.ymd, closures);
	const current = today.find((r) => r.open <= p.hhmm && p.hhmm < r.close);
	if (current) return { open: true, label: `Open now · until ${formatTime(current.close, locale)}` };

	const laterToday = today.find((r) => r.open > p.hhmm);
	if (laterToday) return { open: false, label: `Closed · opens ${formatTime(laterToday.open, locale)}`, closureReason: closure?.reason };

	for (let i = 1; i <= 14; i++) {
		const ymd = addDays(p.ymd, i);
		const r = rangesFor(hours, ymd, closures)[0];
		if (r) {
			const when = i === 1 ? 'tomorrow' : DAY_NAMES[weekdayOf(ymd)];
			return { open: false, label: `Closed · opens ${when} ${formatTime(r.open, locale)}`, closureReason: closure?.reason };
		}
	}
	return { open: false, label: 'Closed', closureReason: closure?.reason };
}

/** Group consecutive days with identical hours: "Mon–Sat 9:30 am – 1:30 pm". */
export function summariseHours(hours: WeeklyHours, locale = 'en-IN'): Array<{ days: string; hours: string }> {
	const out: Array<{ from: Weekday; to: Weekday; text: string }> = [];
	for (const d of WEEKDAYS) {
		const text = formatRanges(hours[d], locale);
		const last = out.at(-1);
		if (last && last.text === text) last.to = d;
		else out.push({ from: d, to: d, text });
	}
	return out.map((g) => ({ days: g.from === g.to ? DAY_NAMES[g.from] : `${DAY_NAMES[g.from]}–${DAY_NAMES[g.to]}`, hours: g.text }));
}

/** schema.org openingHoursSpecification */
export function openingHoursSpec(hours: WeeklyHours) {
	const names: Record<Weekday, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
	return WEEKDAYS.flatMap((d) =>
		(hours[d] ?? []).map((r) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${names[d]}`, opens: r.open, closes: r.close }))
	);
}
