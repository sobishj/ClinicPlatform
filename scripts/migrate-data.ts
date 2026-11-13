/**
 * Move a clinic's data between Cloudflare (D1) and a dedicated server (SQLite + disk).
 * No R2: on Cloudflare, uploaded files live in D1 (table media_chunks).
 *
 *   # server → Cloudflare
 *   npm run migrate:data -- to-cloudflare --db=./data/clinic.db --uploads=./data/uploads
 *   npm run migrate:data -- to-cloudflare --content-only      # content, settings and uploads only
 *
 *   # Cloudflare → server
 *   npm run migrate:data -- from-cloudflare --db=./data/clinic.db --uploads=./data/uploads
 *
 * Uses `wrangler d1 export/execute` (log in with `npx wrangler login` first).
 * Flags: --content-only (to-cloudflare: skip users, appointments, messages, logs, API keys,
 * webhooks), --skip-files, --local (use wrangler's local D1, for a dry run), --d1=<name>.
 *
 * Media URLs (/media/uploads/…) are identical on both targets, so no content rewriting is needed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { parseArgs, openDb, dumpTables, deleteStatements, TABLE_ORDER } from './lib/db.js';
import { mimeFromKey } from '../src/lib/server/storage/types.js';
import { CHUNK_BYTES } from '../src/lib/server/storage/d1.js';

const args = parseArgs();
const mode = process.argv[2];
const dbFile = typeof args.db === 'string' ? args.db : (process.env.DATABASE_PATH ?? './data/clinic.db');
const uploadsDir = path.resolve(typeof args.uploads === 'string' ? args.uploads : (process.env.UPLOAD_DIR ?? './data/uploads'));
const d1Name = typeof args.d1 === 'string' ? args.d1 : 'clinic-db';
const remoteFlag = args.local ? '--local' : '--remote';
const work = path.resolve('data/migration');
mkdirSync(work, { recursive: true });

/** Tables that hold people's data or operational state rather than website content. */
const NON_CONTENT = [
	'users',
	'user_locations',
	'sessions',
	'password_resets',
	'appointments',
	'appointment_notes',
	'messages',
	'audit_log',
	'api_keys',
	'webhooks',
	'webhook_deliveries',
	'rate_limits'
];

function wrangler(...a: string[]) {
	execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', ...a], { stdio: 'inherit', shell: process.platform === 'win32' });
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((n) => {
		const full = path.join(dir, n);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;

async function toCloudflare() {
	if (!existsSync(dbFile)) throw new Error(`No database at ${dbFile}`);
	const sqlite = new Database(dbFile, { readonly: true });
	const tables = TABLE_ORDER.filter((t) => t !== 'media_chunks' && !(args['content-only'] && NON_CONTENT.includes(t)));
	// Check foreign keys at the end of the import, so content can be replaced in any order.
	let sql = 'PRAGMA defer_foreign_keys = true;\n' + deleteStatements(tables) + dumpTables(sqlite, tables);
	sqlite.close();

	if (!args['skip-files']) {
		// Local storage keeps full keys ("uploads/2026/11/x.webp") under UPLOAD_DIR.
		const files = walk(path.join(uploadsDir, 'uploads'));
		sql += 'DELETE FROM "media_chunks";\n';
		let chunks = 0;
		for (const f of files) {
			const key = path.relative(uploadsDir, f).split(path.sep).join('/');
			const bytes = readFileSync(f);
			for (let i = 0, idx = 0; i < bytes.length || idx === 0; i += CHUNK_BYTES, idx++) {
				const hex = bytes.subarray(i, i + CHUNK_BYTES).toString('hex');
				sql += `INSERT INTO "media_chunks" ("key", "idx", "mime", "data") VALUES (${q(key)}, ${idx}, ${q(mimeFromKey(key))}, X'${hex}');\n`;
				chunks++;
			}
		}
		console.log(`  ${files.length} uploaded files → ${chunks} D1 chunks`);
	}

	const file = path.join(work, 'to-d1.sql');
	writeFileSync(file, sql);
	console.log(`→ Applying migrations and importing into D1 "${d1Name}"${args['content-only'] ? ' (content only)' : ''}…`);
	wrangler('d1', 'migrations', 'apply', d1Name, remoteFlag);
	wrangler('d1', 'execute', d1Name, remoteFlag, `--file=${file}`, '--yes');
}

async function fromCloudflare() {
	const dump = path.join(work, 'd1-export.sql');
	console.log(`→ Exporting D1 "${d1Name}" (data only)…`);
	wrangler('d1', 'export', d1Name, remoteFlag, '--no-schema', `--output=${dump}`);
	console.log(`→ Importing into ${dbFile}…`);
	if (existsSync(dbFile)) {
		const backup = `${dbFile}.before-migration-${Date.now()}`;
		writeFileSync(backup, readFileSync(dbFile));
		console.log(`  (existing database copied to ${backup})`);
	}
	const { sqlite } = openDb(dbFile); // creates + migrates schema
	sqlite.pragma('foreign_keys = OFF');
	for (const t of [...TABLE_ORDER].reverse()) sqlite.prepare(`DELETE FROM "${t}"`).run();
	const known = new Set(TABLE_ORDER);
	const statements = readFileSync(dump, 'utf8')
		.split(/;\s*\n/)
		.map((s) => s.trim())
		.filter((s) => /^INSERT INTO\s+"?(\w+)"?/i.test(s) && known.has(/^INSERT INTO\s+"?(\w+)"?/i.exec(s)![1]));
	sqlite.transaction(() => statements.forEach((s) => sqlite.exec(s + ';')))();
	sqlite.pragma('foreign_keys = ON');
	console.log(`  ${statements.length} rows imported.`);

	if (!args['skip-files']) {
		// The server stores files on disk: rebuild them from the D1 chunks.
		const rows = sqlite.prepare('SELECT key, data FROM media_chunks ORDER BY key, idx').all() as Array<{ key: string; data: Buffer }>;
		const files = new Map<string, Buffer[]>();
		for (const r of rows) files.set(r.key, [...(files.get(r.key) ?? []), r.data]);
		for (const [key, parts] of files) {
			const file = path.join(uploadsDir, ...key.split('/'));
			mkdirSync(path.dirname(file), { recursive: true });
			writeFileSync(file, Buffer.concat(parts));
		}
		sqlite.prepare('DELETE FROM media_chunks').run();
		console.log(`  ${files.size} uploaded files written to ${uploadsDir}`);
	}
	sqlite.close();
}

if (mode === 'to-cloudflare') await toCloudflare();
else if (mode === 'from-cloudflare') await fromCloudflare();
else {
	console.error('Usage: npm run migrate:data -- to-cloudflare|from-cloudflare [--db=…] [--uploads=…] [--content-only] [--skip-files] [--local]');
	process.exit(1);
}
console.log('✓ Done');
