import type {
	D1Database,
	ExecutionContext,
	CacheStorage
} from '@cloudflare/workers-types/index';
import type { DB } from '#lib/server/db/index.js';
import type { SessionUser } from '#lib/types.js';
import type { Settings } from '#lib/settings/schema.js';

declare global {
	/** Replaced at build time with 'node' | 'cloudflare'. */
	const __DEPLOY_TARGET__: 'node' | 'cloudflare';

	type Cache = import('@cloudflare/workers-types/index').Cache;

	namespace App {
		interface Locals {
			db: DB;
			user: SessionUser | null;
			sessionId: string | null;
			settings: Settings;
			nonce?: string;
			/** Set when a request is authenticated with an API key. */
			apiKey?: { id: string; name: string; scopes: string[] } | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
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
