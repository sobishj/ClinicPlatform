import { FilterXSS } from 'xss';

/**
 * Allowlist sanitiser for rich text written in the admin editor (bios, service content,
 * FAQ answers, pages). Pure JS (no DOM) so it runs on Workers. Applied on save.
 */
const ALLOWED_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
const ALLOWED_SRC = /^(https:\/\/|\/(?!\/))/i;

const filter = new FilterXSS({
	whiteList: {
		p: [],
		br: [],
		strong: [],
		b: [],
		em: [],
		i: [],
		u: [],
		s: [],
		h2: [],
		h3: [],
		h4: [],
		ul: [],
		ol: [],
		li: [],
		blockquote: [],
		hr: [],
		a: ['href', 'title', 'target', 'rel'],
		img: ['src', 'alt', 'width', 'height', 'loading'],
		table: [],
		thead: [],
		tbody: [],
		tr: [],
		th: [],
		td: []
	},
	stripIgnoreTag: true,
	stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template'],
	allowCommentTag: false,
	onTagAttr(tag, name, value) {
		if (tag === 'a' && name === 'href') return ALLOWED_HREF.test(value.trim()) ? `href="${escapeAttr(value.trim())}"` : '';
		if (tag === 'a' && name === 'target') return value === '_blank' ? 'target="_blank" rel="noopener noreferrer"' : '';
		if (tag === 'a' && name === 'rel') return ''; // set together with target
		if (tag === 'img' && name === 'src') return ALLOWED_SRC.test(value.trim()) ? `src="${escapeAttr(value.trim())}"` : '';
		return undefined;
	}
});

function escapeAttr(v: string) {
	return v.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeHtml(html: string | null | undefined): string {
	if (!html) return '';
	const clean = filter.process(html);
	// Drop empty paragraphs the editor tends to leave behind.
	return clean.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();
}

/** Strip all tags (for meta descriptions, JSON-LD, emails). */
export function toPlainText(html: string | null | undefined, max = 300): string {
	if (!html) return '';
	const text = html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text;
}
