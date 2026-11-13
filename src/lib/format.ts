/** Small formatting helpers shared by public pages and admin. */

/** Digits only, with a default country code for local numbers (India by default). */
export function phoneDigits(phone: string, countryCode = '91'): string {
	let d = phone.replace(/\D/g, '');
	if (d.startsWith('00')) d = d.slice(2);
	if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
	if (d.length === 10) d = countryCode + d;
	return d;
}

export function telLink(phone: string): string {
	const trimmed = phone.trim();
	return `tel:${trimmed.startsWith('+') ? '+' : ''}${trimmed.replace(/[^\d]/g, '')}`;
}

export function whatsappLink(phone: string, text?: string): string {
	const q = text ? `?text=${encodeURIComponent(text)}` : '';
	return `https://wa.me/${phoneDigits(phone)}${q}`;
}

export function formatPrice(amount: number | null | undefined, currency = 'INR', locale = 'en-IN'): string {
	if (amount == null) return '';
	try {
		return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${currency} ${amount}`;
	}
}

export function fullAddress(l: {
	addressLine1?: string | null;
	addressLine2?: string | null;
	area?: string | null;
	city?: string | null;
	state?: string | null;
	postalCode?: string | null;
}): string {
	return [l.addressLine1, l.addressLine2, l.area, [l.city, l.postalCode].filter(Boolean).join(' '), l.state]
		.filter((x) => x && String(x).trim())
		.join(', ');
}

/** Fill {placeholders} in a template string. */
export function fillTemplate(tpl: string, vars: Record<string, string | null | undefined>): string {
	return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]!.toUpperCase())
		.join('');
}
