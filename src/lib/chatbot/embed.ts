/**
 * Third-party chat widget snippets are not injected as raw HTML. We parse them into an
 * allowlisted list of scripts (https src, or inline code) plus data-* attributes, and the
 * client re-creates the <script> tags lazily. The CSP gets the script origins and SHA-256
 * hashes of inline scripts.
 */

export interface EmbedScript {
	src?: string;
	inline?: string;
	attrs: Record<string, string>;
}

export interface ParsedEmbed {
	scripts: EmbedScript[];
	origins: string[];
	inlineHashes: string[];
	errors: string[];
}

const ALLOWED_ATTRS = /^(data-[\w-]+|id|async|defer|type|charset|crossorigin)$/i;
const hashCache = new Map<string, string>();

export function parseEmbedCode(code: string): ParsedEmbed {
	const scripts: EmbedScript[] = [];
	const origins = new Set<string>();
	const errors: string[] = [];
	const inlineHashes: string[] = [];

	const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(code))) {
		const attrs: Record<string, string> = {};
		let src: string | undefined;
		for (const a of m[1].matchAll(/([\w-:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
			const name = a[1].toLowerCase();
			const value = a[2] ?? a[3] ?? a[4] ?? '';
			if (name === 'src') src = value;
			else if (ALLOWED_ATTRS.test(name)) attrs[name] = value;
		}
		if (src) {
			try {
				const u = new URL(src);
				if (u.protocol !== 'https:') throw new Error();
				origins.add(u.origin);
				scripts.push({ src: u.toString(), attrs });
			} catch {
				errors.push(`Ignored script with non-https src: ${src.slice(0, 80)}`);
			}
		} else if (m[2].trim()) {
			const inline = m[2];
			scripts.push({ inline, attrs });
			const h = hashCache.get(inline);
			if (h) inlineHashes.push(h);
			// Origins referenced inside inline loaders, e.g. s.src="https://widget.example.com/x.js"
			for (const u of inline.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) origins.add(u[0].toLowerCase());
		}
	}
	if (!scripts.length && code.trim()) errors.push('No <script> tags found in the embed code.');
	return { scripts, origins: [...origins], inlineHashes, errors };
}

/** Pre-compute CSP hashes for inline scripts (async Web Crypto); call when settings load or save. */
export async function primeEmbedHashes(code: string) {
	const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script\s*>/gi;
	for (const m of code.matchAll(re)) {
		const inline = m[1];
		if (!inline.trim() || hashCache.has(inline)) continue;
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(inline));
		let bin = '';
		for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
		hashCache.set(inline, `sha256-${btoa(bin)}`);
	}
}
