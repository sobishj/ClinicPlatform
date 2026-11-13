import { describe, it, expect } from 'vitest';
import { THEME_PRESETS, matchingPreset } from './theme-presets.js';
import { checkTheme, contrastRatio } from './contrast.js';
import { settingsSchemas } from './settings/schema.js';

describe('colour theme presets', () => {
	it.each(THEME_PRESETS.map((p) => [p.name, p] as const))('%s keeps every text readable (WCAG AA)', (_name, preset) => {
		const failing = checkTheme(preset).filter((c) => !c.ok);
		expect(failing).toEqual([]);
	});

	it('the default theme is a preset', () => {
		expect(matchingPreset(settingsSchemas.theme.parse({}))?.id).toBe('teal-coral');
	});

	it('flags unreadable custom colours', () => {
		const bad = checkTheme({ primary: '#9be7ff', secondary: '#cccccc', accent: '#ffff00', background: '#ffffff' });
		expect(bad.some((c) => !c.ok)).toBe(true);
	});

	it('computes known contrast ratios', () => {
		expect(contrastRatio([1, 1, 1], [0, 0, 0])).toBeCloseTo(21, 0);
	});
});
