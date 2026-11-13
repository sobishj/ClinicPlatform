import { describe, it, expect } from 'vitest';
import { toCsv } from './appointments-admin.js';

describe('toCsv', () => {
	it('quotes, escapes and neutralises spreadsheet formulas', () => {
		const csv = toCsv(
			[
				{ a: 'Plain', b: 'has, comma' },
				{ a: '=HYPERLINK("x")', b: 'line\nbreak' },
				{ a: null, b: '+91 98765 43210' }
			],
			[
				['a', 'A'],
				['b', 'B']
			]
		);
		expect(csv.startsWith('﻿A,B\r\n')).toBe(true);
		expect(csv).toContain('Plain,"has, comma"');
		expect(csv).toContain(`"'=HYPERLINK(""x"")","line\nbreak"`);
		expect(csv).toContain(",'+91 98765 43210");
	});
});
