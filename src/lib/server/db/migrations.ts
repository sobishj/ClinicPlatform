/**
 * Migration SQL bundled into the app (both builds) by the `bundled-migrations` plugin in
 * vite.config.ts, so new client databases can be created and upgraded at runtime — including
 * on Cloudflare, where there is no file system.
 */
import { tenant, platform } from 'virtual:migrations';
import { toMigrations } from './migrator.js';

export const TENANT_MIGRATIONS = toMigrations(tenant);
export const PLATFORM_MIGRATIONS = toMigrations(platform);
