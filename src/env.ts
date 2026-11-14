import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) =>
	value === undefined || value === '' ? undefined : value;

/**
 * Every variable is optional: the site runs with no email, no Turnstile and no S3.
 * Values set here override the equivalent settings stored in the database.
 * See .env.example for documentation.
 */
export const variables = defineEnvVars({
	ORIGIN: { schema: optional, description: 'Public site URL, e.g. https://www.example.com' },
	PLATFORM_ADMIN_HOST: {
		schema: optional,
		description:
			'Host name of the console (super admin), e.g. console.example.com. Default: console.localhost'
	},
	PLATFORM_DATABASE_PATH: {
		schema: optional,
		description: 'Platform SQLite file (node target). Default: ./data/platform.db'
	},
	TENANT_DATA_DIR: {
		schema: optional,
		description:
			'Folder with one sub-folder per client: site.db + uploads (node target). Default: ./data/tenants'
	},
	STORAGE_DRIVER: { schema: optional, description: 'local | s3 (node target)' },
	UPLOAD_DIR: {
		schema: optional,
		description:
			'Root for uploaded files, one sub-folder per client (node target). Default: TENANT_DATA_DIR'
	},
	S3_ENDPOINT: { schema: optional },
	S3_REGION: { schema: optional },
	S3_BUCKET: { schema: optional },
	S3_ACCESS_KEY_ID: { schema: optional },
	S3_SECRET_ACCESS_KEY: { schema: optional },
	EMAIL_PROVIDER: { schema: optional, description: 'resend | smtp | none' },
	EMAIL_FROM: { schema: optional },
	RESEND_API_KEY: { schema: optional },
	SMTP_HOST: { schema: optional },
	SMTP_PORT: { schema: optional },
	SMTP_USER: { schema: optional },
	SMTP_PASS: { schema: optional },
	SMTP_SECURE: { schema: optional },
	TURNSTILE_SITE_KEY: { schema: optional },
	TURNSTILE_SECRET_KEY: { schema: optional },
	CRON_SECRET: {
		schema: optional,
		description:
			'Bearer token for POST /console/cron (all clients) and /api/internal/cron (one client)'
	},
	SETUP_TOKEN: {
		schema: optional,
		description: 'If set, the first-run /console/setup screen requires this token'
	}
});
