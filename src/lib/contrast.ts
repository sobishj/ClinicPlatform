/**
 * WCAG contrast checks for a colour theme. Mirrors the colour tokens in app.css
 * (which are built with color-mix in OKLab) so the admin can warn before a theme
 * makes text hard to read.
 */

type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklab(rgb: RGB): RGB {
	const [r, g, b] = rgb.map(lin);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function fromOklab([L, A, B]: RGB): RGB {
	const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
	const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
	const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map((c) => Math.min(1, Math.max(0, unlin(c)))) as RGB;
}

/** color-mix(in oklab, a p, b) */
const mix = (a: RGB, b: RGB, p: number): RGB => {
	const A = toOklab(a);
	const B = toOklab(b);
	return fromOklab(A.map((v, i) => v * p + B[i] * (1 - p)) as RGB);
};
const luminance = (c: RGB) => c.map(lin).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);

export function contrastRatio(a: RGB, b: RGB): number {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

export interface ThemeColours {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
}

export interface ContrastCheck {
	label: string;
	ratio: number;
	ok: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
/** Normal-size text needs 4.5:1 (WCAG 2.1 AA). */
export const AA = 4.5;

/** The text/background pairs the website actually uses, with their contrast ratios. */
export function checkTheme(t: ThemeColours): ContrastCheck[] {
	if (![t.primary, t.secondary, t.accent, t.background].every((c) => HEX.test(c))) return [];
	const W: RGB = [1, 1, 1];
	const K: RGB = [0, 0, 0];
	const P = hex(t.primary);
	const S = hex(t.secondary);
	const Ac = hex(t.accent);
	const BG = hex(t.background);
	// Same recipes as the tokens in app.css.
	const surface2 = mix(BG, P, 0.9);
	const muted = mix(S, W, 0.84);
	const ink = mix(S, K, 0.92);
	const p700 = mix(P, K, 0.75);
	const a700 = mix(Ac, K, 0.55);
	const a100 = mix(Ac, W, 0.18);
	const pairs: Array<[string, RGB, RGB]> = [
		['White text on buttons (primary)', W, P],
		['Links and small headings on the page background', p700, BG],
		['Links and small headings on tinted sections', p700, surface2],
		['Grey text on tinted sections', muted, surface2],
		['Main text on the page background', ink, BG],
		['Text on accent buttons', ink, Ac],
		['Badges and icons on accent backgrounds', a700, a100],
		['White text on the top bar and footer (secondary)', W, S]
	];
	return pairs.map(([label, fg, bg]) => {
		const ratio = contrastRatio(fg, bg);
		return { label, ratio: Math.round(ratio * 100) / 100, ok: ratio >= AA };
	});
}
