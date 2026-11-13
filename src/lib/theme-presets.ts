/**
 * Ready-made colour themes for the website (Admin → Clinic & branding).
 * Every preset is checked by theme-presets.spec.ts to keep all text readable (WCAG AA).
 */
import type { ThemeColours } from './contrast.js';

export interface ThemePreset extends ThemeColours {
	id: string;
	name: string;
	description: string;
}

export const THEME_PRESETS: ThemePreset[] = [
	{ id: 'teal-coral', name: 'Teal & Coral', description: 'Fresh and lively (default)', primary: '#0a7d8c', secondary: '#16216b', accent: '#ff7a59', background: '#f4fbfb' },
	{ id: 'calm-sage', name: 'Calm Sage', description: 'Soft, warm and quiet', primary: '#0f6b63', secondary: '#24324a', accent: '#e8a05c', background: '#fbf8f4' },
	{ id: 'ocean', name: 'Ocean Blue', description: 'Clean, clinical blue', primary: '#0b6fbf', secondary: '#1d1b5c', accent: '#ffb020', background: '#f5f9ff' },
	{ id: 'orchid', name: 'Orchid', description: 'Elegant purple with gold', primary: '#8a3ea6', secondary: '#2a1240', accent: '#f5b33d', background: '#fbf7fd' },
	{ id: 'fresh-green', name: 'Fresh Green', description: 'Natural and healthy', primary: '#1b7a4a', secondary: '#123b2c', accent: '#ffb547', background: '#f5fbf6' },
	{ id: 'berry', name: 'Berry', description: 'Warm, friendly pink', primary: '#b02a64', secondary: '#3b1230', accent: '#ffb38a', background: '#fff7f9' },
	{ id: 'sunset', name: 'Sunset', description: 'Energetic orange and aqua', primary: '#c2410c', secondary: '#3a1a0c', accent: '#2ec4b6', background: '#fffaf5' },
	{ id: 'navy-gold', name: 'Navy & Gold', description: 'Classic and premium', primary: '#1e4fb0', secondary: '#0f172a', accent: '#f5b942', background: '#f7f9fc' }
];

/** Which preset (if any) matches the given colours exactly. */
export function matchingPreset(t: ThemeColours): ThemePreset | undefined {
	const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
	return THEME_PRESETS.find((p) => eq(p.primary, t.primary) && eq(p.secondary, t.secondary) && eq(p.accent, t.accent) && eq(p.background, t.background));
}
