import { describe, it, expect } from 'vitest';
import { sanitizeHtml, toPlainText } from './sanitize.js';

describe('sanitizeHtml', () => {
	it('keeps basic formatting', () => {
		expect(sanitizeHtml('<h2>Hi</h2><p><strong>Bold</strong> <em>it</em></p><ul><li>a</li></ul>')).toBe(
			'<h2>Hi</h2><p><strong>Bold</strong> <em>it</em></p><ul><li>a</li></ul>'
		);
	});
	it('removes scripts, event handlers and styles', () => {
		const out = sanitizeHtml('<p onclick="x()" style="color:red">Hi<script>alert(1)</script></p><iframe src="//x"></iframe>');
		expect(out).toBe('<p>Hi</p>');
	});
	it('blocks javascript: links and protocol-relative images', () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
		expect(sanitizeHtml('<img src="//evil.com/x.png" alt="a">')).toBe('<img alt="a">');
	});
	it('adds rel=noopener to new-tab links', () => {
		expect(sanitizeHtml('<a href="https://x.com" target="_blank">x</a>')).toBe(
			'<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>'
		);
	});
	it('drops empty paragraphs', () => {
		expect(sanitizeHtml('<p>a</p><p><br></p><p>&nbsp;</p>')).toBe('<p>a</p>');
	});
});

describe('toPlainText', () => {
	it('strips tags and truncates on a word boundary', () => {
		expect(toPlainText('<p>Hello <b>world</b> &amp; friends</p>')).toBe('Hello world & friends');
		expect(toPlainText('<p>one two three four</p>', 10)).toBe('one two…');
	});
});
