import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pageHelp } from './help.js';
import { settingsSchemas } from '../settings/schema.js';

/** Pages shown before signing in don't use the page header. */
const PUBLIC = ['/admin/login', '/admin/forgot', '/admin/reset/[token]', '/admin/setup'];

function adminRouteIds(dir = 'src/routes/admin'): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) return adminRouteIds(full);
		return e.name === '+page.svelte' ? ['/' + path.relative('src/routes', dir).split(path.sep).join('/')] : [];
	});
}

describe('admin page help (ⓘ button)', () => {
	const labels = settingsSchemas.labels.parse({ doctors: 'Dentists', doctor: 'Dentist' });

	it('explains every signed-in admin page', () => {
		const missing = adminRouteIds()
			.filter((id) => !PUBLIC.includes(id))
			.filter((id) => !pageHelp(id, labels));
		expect(missing).toEqual([]);
	});

	it("uses the clinic's own wording", () => {
		expect(pageHelp('/admin/doctors', labels)?.purpose).toContain('dentists');
	});
});
