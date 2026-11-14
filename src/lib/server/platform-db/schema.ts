/**
 * Platform database (one, central): clients (tenants), their domains and the console
 * (super-admin) accounts. Each client's own content, users, bookings and media live in
 * that client's own database — see server/db/schema.ts.
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

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
const bool = (name: string) => integer(name, { mode: 'boolean' });

export const tenants = sqliteTable('tenants', {
	id: id(),
	/** Internal handle (console and CLI only — never shown on the public site). */
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	status: text('status', { enum: ['active', 'suspended'] })
		.notNull()
		.default('active'),
	templateKey: text('template_key').notNull(),
	/** Where the client's database lives: a file id (Node) or a D1 binding name (Cloudflare). */
	dbRef: text('db_ref').notNull().unique(),
	notes: text('notes'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const domains = sqliteTable(
	'domains',
	{
		id: id(),
		tenantId: text('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		/** Lower-case host name without scheme or port, e.g. www.orchiddental.in */
		hostname: text('hostname').notNull().unique(),
		isPrimary: bool('is_primary').notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [index('domains_tenant_idx').on(t.tenantId)]
);

export const platformUsers = sqliteTable('platform_users', {
	id: id(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	active: bool('active').notNull().default(true),
	lastLoginAt: integer('last_login_at'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const platformSessions = sqliteTable(
	'platform_sessions',
	{
		/** SHA-256 of the session token. */
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => platformUsers.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('platform_sessions_user_idx').on(t.userId)]
);

/** One-time tokens that sign a console user into a client's /admin on the client's own domain. */
export const ssoTokens = sqliteTable('sso_tokens', {
	tokenHash: text('token_hash').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => platformUsers.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull(),
	usedAt: integer('used_at')
});

export const platformAudit = sqliteTable(
	'platform_audit',
	{
		id: id(),
		userEmail: text('user_email'),
		action: text('action').notNull(),
		tenantId: text('tenant_id'),
		summary: text('summary'),
		createdAt: createdAt()
	},
	(t) => [index('platform_audit_created_idx').on(t.createdAt)]
);

/** Console login rate limits (same shape as the tenant table, so rateLimit() works on both). */
export const rateLimits = sqliteTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull(),
	resetAt: integer('reset_at').notNull()
});
