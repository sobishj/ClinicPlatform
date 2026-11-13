/**
 * Generates neutral illustrated placeholder images into static/demo/ for seeded demo content.
 * Real clinic photos are uploaded through the admin media library and replace these.
 *   npx tsx scripts/generate-demo-assets.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = path.resolve('static/demo');
mkdirSync(out, { recursive: true });

const palettes = [
	{ a: '#bfe9ec', b: '#ffe3d6', c: '#5cc4cc', d: '#ff9f80', ink: '#0b4f6b' },
	{ a: '#cfe0ff', b: '#ffe9d1', c: '#7aa8f0', d: '#ffb36b', ink: '#1d2f7a' },
	{ a: '#c9f2dd', b: '#fff0cc', c: '#4fc59a', d: '#ffc857', ink: '#145a4a' },
	{ a: '#ffd9e2', b: '#d6f4f6', c: '#ff8fa8', d: '#4fc3cf', ink: '#5a2346' }
];

function hero(i: number) {
	const p = palettes[i % palettes.length];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
<linearGradient id="light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
<rect x="${1040 + i * 40}" y="120" width="620" height="700" rx="24" fill="url(#light)"/>
<path d="M${1040 + i * 40} 470h620M${1350 + i * 40} 120v700" stroke="${p.c}" stroke-width="10" opacity=".55"/>
<rect x="0" y="830" width="1920" height="250" fill="${p.c}" opacity=".35"/>
<rect x="${260 + i * 30}" y="640" width="520" height="190" rx="40" fill="${p.d}" opacity=".9"/>
<rect x="${300 + i * 30}" y="560" width="440" height="120" rx="36" fill="${p.d}"/>
<rect x="${290 + i * 30}" y="830" width="20" height="90" fill="${p.ink}" opacity=".5"/><rect x="${730 + i * 30}" y="830" width="20" height="90" fill="${p.ink}" opacity=".5"/>
<g transform="translate(${1740 - i * 20} 560)"><rect x="-55" y="200" width="110" height="130" rx="16" fill="${p.ink}" opacity=".55"/>
<path d="M0 210C-10 120-90 90-120 20 -40 40-10 100 0 150 10 80 30 20 90-30 80 60 30 120 0 210Z" fill="${p.c}"/>
<path d="M0 205C15 140 70 110 110 80 90 150 40 180 0 205Z" fill="${p.ink}" opacity=".35"/></g>
<circle cx="${560 + i * 200}" cy="220" r="${120 + i * 15}" fill="#fff" opacity=".35"/>
</svg>`;
}

function portrait(i: number) {
	const p = palettes[i % palettes.length];
	const skin = ['#d9a982', '#c48d68', '#e2b896', '#b5795a'][i % 4];
	const hair = ['#2d2420', '#3a2a22', '#1f1b1a', '#4a3528'][i % 4];
	const coat = '#ffffff';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>
<rect width="800" height="1000" fill="url(#bg)"/>
<circle cx="620" cy="180" r="160" fill="#fff" opacity=".35"/>
<path d="M120 1000c0-200 120-330 280-330s280 130 280 330Z" fill="${coat}"/>
<path d="M330 690l70 120 70-120" fill="${p.c}"/>
<path d="M300 700c-40 60-60 150-60 300h40c0-120 20-210 50-270ZM500 700c40 60 60 150 60 300h-40c0-120-20-210-50-270Z" fill="#e8ecef"/>
<rect x="355" y="560" width="90" height="140" rx="40" fill="${skin}"/>
<ellipse cx="400" cy="440" rx="140" ry="165" fill="${skin}"/>
<path d="M260 430c-10-140 60-210 150-210 100 0 160 70 140 210-20-70-60-110-140-110-70 0-120 40-150 110Z" fill="${hair}"/>
<path d="M330 800c0 40 30 70 70 70" stroke="${p.ink}" stroke-width="10" fill="none" opacity=".6"/>
<circle cx="400" cy="878" r="16" fill="${p.ink}" opacity=".6"/>
</svg>`;
}

function building(i: number) {
	const p = palettes[i % palettes.length];
	let windows = '';
	for (let r = 0; r < 3; r++)
		for (let c = 0; c < 4; c++)
			windows += `<rect x="${360 + c * 130}" y="${220 + r * 120}" width="90" height="80" rx="8" fill="#fff" opacity=".8"/>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#sky)"/>
<circle cx="${980 - i * 60}" cy="140" r="70" fill="#fff" opacity=".6"/>
<rect x="320" y="160" width="560" height="560" rx="12" fill="${p.c}"/>
<rect x="320" y="160" width="560" height="30" fill="${p.ink}" opacity=".25"/>
${windows}
<rect x="540" y="580" width="120" height="140" rx="8" fill="${p.ink}" opacity=".7"/>
<rect x="470" y="545" width="260" height="22" rx="6" fill="${p.d}"/>
<rect x="0" y="720" width="1200" height="80" fill="${p.ink}" opacity=".18"/>
<g fill="${p.ink}" opacity=".45"><circle cx="190" cy="560" r="90"/><rect x="180" y="600" width="20" height="120"/><circle cx="1020" cy="580" r="70"/><rect x="1010" y="610" width="20" height="110"/></g>
</svg>`;
}

function badge(i: number, label: string, sub: string) {
	const p = palettes[i % palettes.length];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#fff"/>
<circle cx="200" cy="200" r="150" fill="${p.a}" stroke="${p.ink}" stroke-width="8"/>
<circle cx="200" cy="200" r="120" fill="none" stroke="${p.ink}" stroke-width="3" stroke-dasharray="6 8"/>
<path d="M150 205l35 35 70-80" stroke="${p.ink}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="200" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="${p.ink}">${label}</text>
<text x="200" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" letter-spacing="3" fill="${p.ink}">${sub}</text>
</svg>`;
}

function interior(i: number) {
	const p = palettes[i % palettes.length];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
<rect width="1200" height="900" fill="${p.b}"/>
<rect y="620" width="1200" height="280" fill="${p.c}" opacity=".45"/>
<rect x="${120 + i * 50}" y="120" width="360" height="420" rx="18" fill="#fff" opacity=".7"/>
<path d="M${700 - i * 40} 620c0-140 80-220 220-220h40c40 0 60 30 50 70l-40 150Z" fill="${p.d}"/>
<rect x="${660 - i * 40}" y="600" width="380" height="40" rx="20" fill="${p.ink}" opacity=".6"/>
<circle cx="${900 - i * 40}" cy="230" r="70" fill="${p.a}"/><rect x="${895 - i * 40}" y="230" width="10" height="190" fill="${p.ink}" opacity=".5"/>
<path d="M${900 - i * 40} 200a40 40 0 0 1 0 0" stroke="${p.ink}"/>
</svg>`;
}

const files: Record<string, string> = {};
for (let i = 0; i < 3; i++) files[`hero-${i + 1}.svg`] = hero(i);
for (let i = 0; i < 6; i++) files[`doctor-${i + 1}.svg`] = portrait(i);
for (let i = 0; i < 3; i++) files[`location-${i + 1}.svg`] = building(i);
for (let i = 0; i < 6; i++) files[`interior-${i + 1}.svg`] = interior(i);
const badges = [
	['QUALITY', 'CERTIFIED'],
	['SAFETY', 'ACCREDITED'],
	['HYGIENE', 'AUDITED'],
	['CARE', 'EXCELLENCE']
];
badges.forEach(([l, s], i) => (files[`badge-${i + 1}.svg`] = badge(i, l, s)));
files['logo.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0a7d8c"/><path d="M22 18c-5 0-8 4-8 9 0 4 1.6 6.8 2.8 10 1.4 3.8 1.6 8 2.6 12 .8 3.2 2 5 3.8 5 2.6 0 3-3.6 3.6-6.8.6-3 1.4-6.2 4.2-6.2s3.6 3.2 4.2 6.2c.6 3.2 1 6.8 3.6 6.8 1.8 0 3-1.8 3.8-5 1-4 1.2-8.2 2.6-12C48.4 33.8 50 31 50 27c0-5-3-9-8-9-3.8 0-5.8 2.4-9 2.4S25.8 18 22 18Z" fill="#fff"/></svg>`;

for (const [name, svg] of Object.entries(files)) writeFileSync(path.join(out, name), svg.trim() + '\n');
console.log(`Wrote ${Object.keys(files).length} files to ${out}`);
