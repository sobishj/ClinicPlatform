import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as platformSchema from './schema.js';

/** The platform (console) database. Same query-builder API on D1 and better-sqlite3. */
export type PlatformDB = DrizzleD1Database<typeof platformSchema>;
export { platformSchema };
