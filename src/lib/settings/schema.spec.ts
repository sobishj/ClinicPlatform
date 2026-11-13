import { describe, it, expect } from 'vitest';
import { defaultSettings, parseSettingsGroup, HOMEPAGE_SECTIONS } from './schema.js';

describe('settings schema', () => {
	it('produces complete defaults', () => {
		const s = defaultSettings();
		expect(s.clinic.timeZone).toBe('Asia/Kolkata');
		expect(s.clinic.currency).toBe('INR');
		expect(s.booking.mode).toBe('request');
		expect(s.modules.chatbot).toBe(false);
		expect(s.homepage.sections.map((x) => x.id)).toEqual([...HOMEPAGE_SECTIONS]);
	});

	it('keeps valid fields and defaults invalid ones', () => {
		const theme = parseSettingsGroup('theme', { primary: '#112233', secondary: 'not-a-colour' });
		expect(theme.primary).toBe('#112233');
		expect(theme.secondary).toBe('#24324a');
	});

	it('accepts Indian mobile numbers with the default pattern', () => {
		const re = new RegExp(defaultSettings().booking.phonePattern);
		for (const ok of ['9876543210', '+91 98765 43210', '+919876543210', '098765 43210', '91-98765-43210'])
			expect(re.test(ok), ok).toBe(true);
		for (const bad of ['12345', '5876543210', '98765432101', 'abcdefghij']) expect(re.test(bad), bad).toBe(false);
	});
});
