import type { Settings } from '../../settings/schema.js';

export function esc(s: unknown): string {
	return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Minimal, client-safe HTML email layout using the clinic's brand colour. */
export function layout(s: Settings, title: string, bodyHtml: string): string {
	const c = s.theme.primary;
	return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${c};color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${esc(s.clinic.name)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#6b7280">${esc(s.clinic.name)}${s.clinic.phones[0] ? ' · ' + esc(s.clinic.phones[0]) : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

export function button(href: string, label: string, color: string): string {
	return `<p style="margin:24px 0"><a href="${esc(href)}" style="background:${color};color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;
}

export function table(rows: Array<[string, string | null | undefined]>): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${rows
		.filter(([, v]) => v)
		.map(
			([k, v]) =>
				`<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`
		)
		.join('')}</table>`;
}
