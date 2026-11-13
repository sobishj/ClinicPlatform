/**
 * Drizzle schema (SQLite dialect — D1 on Cloudflare, better-sqlite3 on a server).
 *
 * Portability notes (for a future Postgres option):
 *  - ids are text UUIDs, timestamps are integer milliseconds (UTC), JSON lives in text columns
 *  - no SQLite-only functions are used in queries outside this folder
 */
import { sql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	blob,
	real,
	primaryKey,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import type {
	WeeklyHours,
	SeoFields,
	ImageRef,
	ServiceFaq,
	ProcedureStep
} from '../../types.js';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
	integer('created_at', { mode: 'number' })
		.notNull()
		.$defaultFn(() => Date.now());
const updatedAt = () =>
	integer('updated_at', { mode: 'number' })
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdateFn(() => Date.now());
const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();
const bool = (name: string) => integer(name, { mode: 'boolean' });

// ───────────────────────── settings ─────────────────────────

/** One row per settings group (clinic, theme, labels, modules, booking, …). Value is JSON. */
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: json<unknown>('value').notNull(),
	updatedAt: updatedAt()
});

// ───────────────────────── auth ─────────────────────────

export const users = sqliteTable('users', {
	id: id(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['super_admin', 'clinic_admin', 'branch_staff'] }).notNull(),
	active: bool('active').notNull().default(true),
	lastLoginAt: integer('last_login_at'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const userLocations = sqliteTable(
	'user_locations',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.userId, t.locationId] })]
);

export const sessions = sqliteTable(
	'sessions',
	{
		/** SHA-256 of the session token; the raw token only lives in the cookie. */
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at').notNull(),
		createdAt: createdAt(),
		userAgent: text('user_agent')
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const passwordResets = sqliteTable('password_resets', {
	tokenHash: text('token_hash').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull(),
	usedAt: integer('used_at')
});

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: id(),
		userId: text('user_id'),
		userEmail: text('user_email'),
		action: text('action').notNull(), // create | update | delete | login | …
		entity: text('entity').notNull(),
		entityId: text('entity_id'),
		summary: text('summary'),
		createdAt: createdAt()
	},
	(t) => [index('audit_created_idx').on(t.createdAt)]
);

// ───────────────────────── media ─────────────────────────

export const media = sqliteTable(
	'media',
	{
		id: id(),
		/** Storage key (D1 chunks on Cloudflare; disk / S3 on a server). */
		key: text('key').notNull().unique(),
		/** Public URL, e.g. /media/2026/11/abc.webp or /demo/hero-1.svg for seeded files. */
		url: text('url').notNull(),
		alt: text('alt').notNull(),
		filename: text('filename'),
		mime: text('mime').notNull(),
		size: integer('size').notNull().default(0),
		width: integer('width'),
		height: integer('height'),
		folder: text('folder'),
		createdAt: createdAt()
	},
	(t) => [index('media_created_idx').on(t.createdAt)]
);

/**
 * Uploaded file contents on Cloudflare (no R2): each file is split into chunks of
 * ≤ 40 KB so every row — and every SQL statement used to copy it — stays well under
 * D1's limits (2 MB per row, 100 KB per statement). Not used by the Node build,
 * which stores files on disk/S3.
 */
export const mediaChunks = sqliteTable(
	'media_chunks',
	{
		key: text('key').notNull(),
		idx: integer('idx').notNull(),
		mime: text('mime').notNull(),
		data: blob('data', { mode: 'buffer' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.key, t.idx] })]
);

// ───────────────────────── locations ─────────────────────────

export const locations = sqliteTable(
	'locations',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		type: text('type').notNull().default('Branch'),
		parentId: text('parent_id'),
		addressLine1: text('address_line1').notNull().default(''),
		addressLine2: text('address_line2'),
		area: text('area'),
		city: text('city').notNull().default(''),
		state: text('state'),
		postalCode: text('postal_code'),
		country: text('country').default('IN'),
		phones: json<string[]>('phones').notNull().default([]),
		whatsapp: text('whatsapp'),
		email: text('email'),
		notificationEmail: text('notification_email'),
		mapEmbedUrl: text('map_embed_url'),
		directionsUrl: text('directions_url'),
		latitude: real('latitude'),
		longitude: real('longitude'),
		hours: json<WeeklyHours>('hours').notNull().default({}),
		photos: json<ImageRef[]>('photos').notNull().default([]),
		summary: text('summary'),
		description: text('description'),
		/** inherit | request | slots */
		bookingMode: text('booking_mode').notNull().default('inherit'),
		active: bool('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		seo: json<SeoFields>('seo'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('locations_order_idx').on(t.sortOrder)]
);

export const locationClosures = sqliteTable(
	'location_closures',
	{
		id: id(),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' }),
		/** YYYY-MM-DD in clinic time zone (inclusive range). */
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		reason: text('reason')
	},
	(t) => [index('closures_loc_idx').on(t.locationId)]
);

// ───────────────────────── doctors ─────────────────────────

export const doctors = sqliteTable(
	'doctors',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		title: text('title').default('Dr.'),
		name: text('name').notNull(),
		photo: json<ImageRef | null>('photo'),
		photoPortrait: json<ImageRef | null>('photo_portrait'),
		qualifications: text('qualifications'),
		specialities: json<string[]>('specialities').notNull().default([]),
		registrationNumber: text('registration_number'),
		experienceYears: integer('experience_years'),
		languages: json<string[]>('languages').notNull().default([]),
		summary: text('summary'),
		bio: text('bio'),
		featured: bool('featured').notNull().default(false),
		active: bool('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		seo: json<SeoFields>('seo'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('doctors_order_idx').on(t.sortOrder)]
);

export const doctorLocations = sqliteTable(
	'doctor_locations',
	{
		doctorId: text('doctor_id')
			.notNull()
			.references(() => doctors.id, { onDelete: 'cascade' }),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' }),
		/** Weekly schedule at this branch (clinic-local times). */
		schedule: json<WeeklyHours>('schedule').notNull().default({}),
		bookable: bool('bookable').notNull().default(true)
	},
	(t) => [
		primaryKey({ columns: [t.doctorId, t.locationId] }),
		index('doctor_locations_loc_idx').on(t.locationId)
	]
);

export const doctorLeaves = sqliteTable(
	'doctor_leaves',
	{
		id: id(),
		doctorId: text('doctor_id')
			.notNull()
			.references(() => doctors.id, { onDelete: 'cascade' }),
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		reason: text('reason')
	},
	(t) => [index('leaves_doctor_idx').on(t.doctorId)]
);

// ───────────────────────── services ─────────────────────────

export const services = sqliteTable(
	'services',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		category: text('category'),
		icon: text('icon'),
		image: json<ImageRef | null>('image'),
		summary: text('summary'),
		content: text('content'),
		benefits: json<string[]>('benefits').notNull().default([]),
		steps: json<ProcedureStep[]>('steps').notNull().default([]),
		faqs: json<ServiceFaq[]>('faqs').notNull().default([]),
		durationMinutes: integer('duration_minutes'),
		price: integer('price'),
		priceFrom: bool('price_from').notNull().default(true),
		active: bool('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		seo: json<SeoFields>('seo'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('services_order_idx').on(t.sortOrder)]
);

export const serviceLocations = sqliteTable(
	'service_locations',
	{
		serviceId: text('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'cascade' }),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.serviceId, t.locationId] })]
);

export const serviceDoctors = sqliteTable(
	'service_doctors',
	{
		serviceId: text('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'cascade' }),
		doctorId: text('doctor_id')
			.notNull()
			.references(() => doctors.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.serviceId, t.doctorId] })]
);

// ───────────────────────── certifications ─────────────────────────

export const certifications = sqliteTable('certifications', {
	id: id(),
	title: text('title').notNull(),
	issuer: text('issuer'),
	year: integer('year'),
	image: json<ImageRef | null>('image'),
	description: text('description'),
	pdfUrl: text('pdf_url'),
	active: bool('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// ───────────────────────── hero slides ─────────────────────────

export const slides = sqliteTable('slides', {
	id: id(),
	image: json<ImageRef>('image').notNull(),
	mobileImage: json<ImageRef | null>('mobile_image'),
	heading: text('heading'),
	subheading: text('subheading'),
	buttonText: text('button_text'),
	buttonLink: text('button_link'),
	/** left | center | right */
	align: text('align').notNull().default('left'),
	/** 0–90 (% darkness of the overlay) */
	overlay: integer('overlay').notNull().default(35),
	active: bool('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// ───────────────────────── simple content collections ─────────────────────────

/**
 * Small, flat content lists (intent cards, process steps, technology, amenities,
 * testimonials, FAQs, gallery). Fields per collection are defined in
 * src/lib/content/collections.ts and validated with Zod.
 */
export const blocks = sqliteTable(
	'blocks',
	{
		id: id(),
		collection: text('collection').notNull(),
		data: json<Record<string, unknown>>('data').notNull(),
		active: bool('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('blocks_collection_idx').on(t.collection, t.sortOrder)]
);

/** Custom pages, legal pages and blog posts. */
export const pages = sqliteTable(
	'pages',
	{
		id: id(),
		/** page | post */
		kind: text('kind').notNull().default('page'),
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		excerpt: text('excerpt'),
		content: text('content'),
		coverImage: json<ImageRef | null>('cover_image'),
		published: bool('published').notNull().default(true),
		publishedAt: integer('published_at'),
		showInFooter: bool('show_in_footer').notNull().default(false),
		seo: json<SeoFields>('seo'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('pages_kind_slug_idx').on(t.kind, t.slug)]
);

// ───────────────────────── appointments ─────────────────────────

export const appointments = sqliteTable(
	'appointments',
	{
		id: id(),
		reference: text('reference').notNull().unique(),
		locationId: text('location_id')
			.notNull()
			.references(() => locations.id),
		doctorId: text('doctor_id'),
		serviceId: text('service_id'),
		/** YYYY-MM-DD (clinic local) */
		preferredDate: text('preferred_date').notNull(),
		/** morning | afternoon | evening | slot */
		timeWindow: text('time_window').notNull(),
		/** Live-slot mode only: exact slot in UTC ms. */
		slotStart: integer('slot_start'),
		slotEnd: integer('slot_end'),
		patientName: text('patient_name').notNull(),
		phone: text('phone').notNull(),
		email: text('email'),
		notes: text('notes'),
		consentAt: integer('consent_at').notNull(),
		status: text('status', {
			enum: ['new', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show']
		})
			.notNull()
			.default('new'),
		/** web | phone | api | chatbot */
		source: text('source').notNull().default('web'),
		externalId: text('external_id'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('appt_loc_date_idx').on(t.locationId, t.preferredDate),
		index('appt_status_idx').on(t.status),
		index('appt_created_idx').on(t.createdAt),
		index('appt_phone_idx').on(t.phone),
		// Double-booking guard for live slots: one active booking per doctor per slot.
		uniqueIndex('appt_doctor_slot_uq')
			.on(t.doctorId, t.slotStart)
			.where(sql`slot_start IS NOT NULL AND doctor_id IS NOT NULL AND status <> 'cancelled'`)
	]
);

export const appointmentNotes = sqliteTable(
	'appointment_notes',
	{
		id: id(),
		appointmentId: text('appointment_id')
			.notNull()
			.references(() => appointments.id, { onDelete: 'cascade' }),
		userId: text('user_id'),
		userName: text('user_name'),
		note: text('note').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('appt_notes_idx').on(t.appointmentId)]
);

/** Contact-form messages (kept even when no email provider is configured). */
export const messages = sqliteTable(
	'messages',
	{
		id: id(),
		locationId: text('location_id'),
		name: text('name').notNull(),
		phone: text('phone'),
		email: text('email'),
		subject: text('subject'),
		body: text('body').notNull(),
		consentAt: integer('consent_at').notNull(),
		/** new | read | archived */
		status: text('status').notNull().default('new'),
		createdAt: createdAt()
	},
	(t) => [index('messages_created_idx').on(t.createdAt)]
);

// ───────────────────────── rate limits ─────────────────────────

export const rateLimits = sqliteTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull(),
	resetAt: integer('reset_at').notNull()
});

// ───────────────────────── integrations ─────────────────────────

export const apiKeys = sqliteTable('api_keys', {
	id: id(),
	name: text('name').notNull(),
	/** First characters of the key, shown in the admin list. */
	prefix: text('prefix').notNull(),
	keyHash: text('key_hash').notNull().unique(),
	scopes: json<string[]>('scopes').notNull().default([]),
	lastUsedAt: integer('last_used_at'),
	revokedAt: integer('revoked_at'),
	createdBy: text('created_by'),
	createdAt: createdAt()
});

export const webhooks = sqliteTable('webhooks', {
	id: id(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	secret: text('secret').notNull(),
	events: json<string[]>('events').notNull().default([]),
	active: bool('active').notNull().default(true),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const webhookDeliveries = sqliteTable(
	'webhook_deliveries',
	{
		id: id(),
		webhookId: text('webhook_id')
			.notNull()
			.references(() => webhooks.id, { onDelete: 'cascade' }),
		event: text('event').notNull(),
		payload: text('payload').notNull(),
		/** pending | success | failed */
		status: text('status').notNull().default('pending'),
		attempts: integer('attempts').notNull().default(0),
		nextAttemptAt: integer('next_attempt_at'),
		responseStatus: integer('response_status'),
		lastError: text('last_error'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('deliveries_status_idx').on(t.status, t.nextAttemptAt),
		index('deliveries_webhook_idx').on(t.webhookId, t.createdAt)
	]
);
