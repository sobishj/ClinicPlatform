/**
 * Move a clinic's data between Cloudflare (D1 + R2) and a dedicated server (SQLite + disk).
 *
 *   # Cloudflare → server
 *   npm run migrate:data -- from-cloudflare --db=./data/clinic.db --uploads=./data/uploads
 *
 *   # server → Cloudflare
 *   npm run migrate:data -- to-cloudflare --db=./data/clinic.db --uploads=./data/uploads
 *
 * Database: uses `wrangler d1 export/execute` (log in with `npx wrangler login` first).
 * Files: uses R2's S3-compatible API — set R2_S3_ENDPOINT, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY and R2_BUCKET (create an R2 API token in the Cloudflare dashboard).
 * Add --skip-files or --skip-db to move only one part. Add --local to use wrangler's local D1.
 *
 * Media URLs (/media/uploads/…) are identical on both targets, so no content rewriting is needed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { parseArgs, openDb, dumpTables, deleteStatements, TABLE_ORDER } from './lib/db.js';
import { s3Storage } from '../src/lib/server/storage/s3.js';
import { mimeFromKey } from '../src/lib/server/storage/types.js';

const args = parseArgs();
const mode = process.argv[2];
const dbFile = typeof args.db === 'string' ? args.db : (process.env.DATABASE_PATH ?? './data/clinic.db');
const uploadsDir = path.resolve(typeof args.uploads === 'string' ? args.uploads : (process.env.UPLOAD_DIR ?? './data/uploads'));
const d1Name = typeof args.d1 === 'string' ? args.d1 : 'clinic-db';
const remoteFlag = args.local ? '--local' : '--remote';
const work = path.resolve('data/migration');
mkdirSync(work, { recursive: true });

function wrangler(...a: string[]) {
	execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', ...a], { stdio: 'inherit', shell: process.platform === 'win32' });
}

function r2() {
	const { R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
	if (!R2_S3_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
		throw new Error('Set R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (and R2_BUCKET) to move files, or pass --skip-files.');
	}
	return s3Storage({ endpoint: R2_S3_ENDPOINT, bucket: R2_BUCKET ?? 'clinic-media', accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto' });
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((n) => {
		const full = path.join(dir, n);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

async function fromCloudflare() {
	if (!args['skip-db']) {
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
		const run = sqlite.transaction(() => statements.forEach((s) => sqlite.exec(s + ';')));
		run();
		sqlite.pragma('foreign_keys = ON');
		console.log(`  ${statements.length} rows imported.`);
		sqlite.close();
	}
	if (!args['skip-files']) {
		const bucket = r2();
		const keys = (await bucket.list!('uploads/')).filter((k) => !k.endsWith('/'));
		console.log(`→ Downloading ${keys.length} files from R2 to ${uploadsDir}…`);
		for (const key of keys) {
			const obj = await bucket.get(key);
			if (!obj) continue;
			const file = path.join(uploadsDir, ...key.split('/'));
			mkdirSync(path.dirname(file), { recursive: true });
			const body = obj.body instanceof ReadableStream ? new Uint8Array(await new Response(obj.body).arrayBuffer()) : new Uint8Array(obj.body as ArrayBuffer);
			writeFileSync(file, body);
		}
	}
}

async function toCloudflare() {
	if (!args['skip-db']) {
		if (!existsSync(dbFile)) throw new Error(`No database at ${dbFile}`);
		const sqlite = new Database(dbFile, { readonly: true });
		const tables = TABLE_ORDER.filter((t) => t !== 'rate_limits');
		const sql = deleteStatements([...tables, 'sessions']) + dumpTables(sqlite, tables);
		sqlite.close();
		const file = path.join(work, 'to-d1.sql');
		writeFileSync(file, sql);
		console.log(`→ Applying migrations and importing into D1 "${d1Name}"…`);
		wrangler('d1', 'migrations', 'apply', d1Name, remoteFlag);
		wrangler('d1', 'execute', d1Name, remoteFlag, `--file=${file}`, '--yes');
	}
	if (!args['skip-files']) {
		const bucket = r2();
		// Local storage keeps full keys ("uploads/2026/11/x.webp") under UPLOAD_DIR.
		const root = uploadsDir;
		const files = walk(path.join(root, 'uploads'));
		console.log(`→ Uploading ${files.length} files to R2…`);
		for (const f of files) {
			const key = path.relative(root, f).split(path.sep).join('/');
			await bucket.put(key, readFileSync(f), mimeFromKey(key));
		}
	}
}

if (mode === 'from-cloudflare') await fromCloudflare();
else if (mode === 'to-cloudflare') await toCloudflare();
else {
	console.error('Usage: npm run migrate:data -- from-cloudflare|to-cloudflare [--db=…] [--uploads=…] [--skip-db] [--skip-files] [--local]');
	process.exit(1);
}
console.log('✓ Done');
