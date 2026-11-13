import { FONT_CHOICES } from './settings/schema.js';

interface ThemeLike {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	card?: string;
	headingFont: string;
	bodyFont: string;
	radius: 'square' | 'soft' | 'round';
}

const SERIF = new Set([
	'Fraunces',
	'Lora',
	'Playfair Display',
	'DM Serif Display',
	'Merriweather',
	'Libre Baskerville',
	'Cormorant Garamond',
	'Newsreader'
]);

const HEX = /^#[0-9a-fA-F]{6}$/;
const safeColor = (c: string, fallback: string) => (HEX.test(c) ? c : fallback);
const safeFont = (f: string, fallback: string) =>
	(FONT_CHOICES as readonly string[]).includes(f) ? f : fallback;

const RADIUS = { square: '0.375rem', soft: '1rem', round: '1.75rem' } as const;

/** CSS custom properties for :root. All values are validated, so this is safe to inline. */
export function themeCss(t: ThemeLike): string {
	const heading = safeFont(t.headingFont, 'Fraunces');
	const body = safeFont(t.bodyFont, 'DM Sans');
	return [
		`--brand-primary:${safeColor(t.primary, '#0a7d8c')}`,
		`--brand-secondary:${safeColor(t.secondary, '#16216b')}`,
		`--brand-accent:${safeColor(t.accent, '#ff7a59')}`,
		`--brand-bg:${safeColor(t.background, '#f4fbfb')}`,
		`--brand-card:${safeColor(t.card ?? '#ffffff', '#ffffff')}`,
		`--brand-font-heading:'${heading}'`,
		`--brand-font-body:'${body}'`,
		`--brand-radius:${RADIUS[t.radius] ?? RADIUS.soft}`
	].join(';');
}

/** Google Fonts stylesheet URL for the selected heading/body fonts. */
export function googleFontsUrl(t: Pick<ThemeLike, 'headingFont' | 'bodyFont'>): string {
	const families = [...new Set([safeFont(t.headingFont, 'Fraunces'), safeFont(t.bodyFont, 'DM Sans')])];
	const q = families
		.map((f) => {
			const name = f.replace(/ /g, '+');
			// Fraunces: load the optical-size axis and switch its "wonky" alternates off
			// (otherwise large headings get a leaning, curly f, h, m and n).
			if (f === 'Fraunces') return `family=${name}:opsz,wght,SOFT,WONK@9..144,400..700,0,0`;
			return f === 'DM Serif Display' ? `family=${name}` : `family=${name}:wght@400;500;600;700`;
		})
		.join('&');
	return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

/** Readable text colour (#fff or near-black) for a background hex. */
export function contrastText(hex: string): string {
	if (!HEX.test(hex)) return '#ffffff';
	const n = parseInt(hex.slice(1), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return l > 0.45 ? '#1a1f2b' : '#ffffff';
}
