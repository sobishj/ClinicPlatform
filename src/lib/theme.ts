import { FONT_CHOICES, type SizeStep } from './settings/schema.js';

interface ThemeLike {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	card?: string;
	headingFont: string;
	bodyFont: string;
	radius: 'square' | 'soft' | 'round';
	nameFont?: string;
	nameSize?: SizeStep;
	logoSize?: SizeStep;
	textSize?: SizeStep;
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
/** Desktop sizes; the header scales them down a little on phones. */
const NAME_SIZE = { sm: '1rem', md: '1.25rem', lg: '1.5rem', xl: '1.875rem' } as const;
const LOGO_HEIGHT = { sm: '2.25rem', md: '2.75rem', lg: '3.5rem', xl: '4rem' } as const;
/** Root font size for the public website (everything is sized in rem, so it all scales together). */
export const TEXT_SCALE = { sm: '93.75%', md: '100%', lg: '106.25%', xl: '112.5%' } as const;

export const SIZE_LABELS: Record<SizeStep, string> = { sm: 'Small', md: 'Standard', lg: 'Large', xl: 'Extra large' };

const stack = (f: string) => `'${f}', ${SERIF.has(f) ? 'ui-serif, Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'}`;
const pick = <T extends Record<string, string>>(map: T, k: string | undefined): string => map[k as keyof T] ?? map.md;

/** Font used for the clinic name (falls back to the heading font). */
export function nameFontOf(t: Pick<ThemeLike, 'nameFont' | 'headingFont'>): string {
	return safeFont(t.nameFont || '', safeFont(t.headingFont, 'Fraunces'));
}
export const textScale = (t: Pick<ThemeLike, 'textSize'>) => pick(TEXT_SCALE, t.textSize);

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
		`--brand-radius:${RADIUS[t.radius] ?? RADIUS.soft}`,
		`--brand-font-name:${stack(nameFontOf(t))}`,
		`--brand-name-size:${pick(NAME_SIZE, t.nameSize)}`,
		`--brand-logo-h:${pick(LOGO_HEIGHT, t.logoSize)}`
	].join(';');
}

/** Google Fonts stylesheet URL for the selected heading/body fonts. */
export function googleFontsUrl(t: Pick<ThemeLike, 'headingFont' | 'bodyFont' | 'nameFont'>): string {
	const families = [...new Set([safeFont(t.headingFont, 'Fraunces'), safeFont(t.bodyFont, 'DM Sans'), nameFontOf(t)])];
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
