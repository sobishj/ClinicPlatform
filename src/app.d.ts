import type { D1Database, ExecutionContext, CacheStorage } from '@cloudflare/workers-types/index';
import type { DB } from '#lib/server/db/index.js';
import type { SessionUser } from '#lib/types.js';
import type { Settings } from '#lib/settings/schema.js';
import type { PlatformDB } from '#lib/server/platform-db/index.js';
import type { SiteTenant } from '#lib/server/tenancy/hosts.js';
import type { ConsoleUser } from '#lib/server/console/auth.js';

declare global {
	/** Replaced at build time with 'node' | 'cloudflare'. */
	const __DEPLOY_TARGET__: 'node' | 'cloudflare';

	type Cache = import('@cloudflare/workers-types/index').Cache;

	namespace App {
		interface Locals {
			/** The current client's own database (client hosts only). */
			db: DB;
			/** The client this request belongs to (null on the console host). */
			tenant: SiteTenant | null;
			/** Platform database: clients, domains, console users. */
			platformDb: PlatformDB;
			/** Signed-in console user (console host only). */
			consoleUser: ConsoleUser | null;
			user: SessionUser | null;
			sessionId: string | null;
			settings: Settings;
			nonce?: string;
			/** Set when a request is authenticated with an API key. */
			apiKey?: { id: string; name: string; scopes: string[] } | null;
		}
		interface Platform {
			env: {
				PLATFORM_DB: D1Database;
				[key: string]: unknown;
			};
			ctx: ExecutionContext;
			caches: CacheStorage;
		}
		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
