/** Types shared between server, client and the schema. Keep this file dependency-free. */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday'
};

/** "HH:MM" 24-hour clinic-local time. */
export interface TimeRange {
	open: string;
	close: string;
}

/** Missing or empty day = closed. Multiple ranges allow split shifts (9–1, 4–8). */
export type WeeklyHours = Partial<Record<Weekday, TimeRange[]>>;

export interface ImageRef {
	url: string;
	alt: string;
	width?: number | null;
	height?: number | null;
	mediaId?: string | null;
}

export interface SeoFields {
	title?: string;
	description?: string;
	ogImage?: string;
}

export interface ServiceFaq {
	question: string;
	answer: string;
}

export interface ProcedureStep {
	title: string;
	description?: string;
}

export type Role = 'super_admin' | 'clinic_admin' | 'branch_staff';

export const ROLE_LABELS: Record<Role, string> = {
	super_admin: 'Super admin',
	clinic_admin: 'Clinic admin',
	branch_staff: 'Branch staff'
};

export type AppointmentStatus =
	| 'new'
	| 'confirmed'
	| 'rescheduled'
	| 'completed'
	| 'cancelled'
	| 'no_show';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
	'new',
	'confirmed',
	'rescheduled',
	'completed',
	'cancelled',
	'no_show'
];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
	new: 'New',
	confirmed: 'Confirmed',
	rescheduled: 'Rescheduled',
	completed: 'Completed',
	cancelled: 'Cancelled',
	no_show: 'No-show'
};

export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'slot';

export const TIME_WINDOWS: Record<Exclude<TimeWindow, 'slot'>, { label: string; from: string; to: string }> = {
	morning: { label: 'Morning', from: '00:00', to: '12:00' },
	afternoon: { label: 'Afternoon', from: '12:00', to: '16:00' },
	evening: { label: 'Evening', from: '16:00', to: '23:59' }
};

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: Role;
	locationIds: string[];
}
