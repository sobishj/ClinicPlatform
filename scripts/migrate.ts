/** Apply Drizzle migrations to the local SQLite database (the node server also does this on start). */
import { parseArgs, openDb } from './lib/db.js';

const args = parseArgs();
const file = typeof args.db === 'string' ? args.db : (process.env.DATABASE_PATH ?? './data/clinic.db');
const { sqlite } = openDb(file);
sqlite.close();
console.log(`✓ Migrations applied to ${file}`);
