/** Deep link into the booking flow, pre-filled with any of location/doctor/service (slugs). */
export function bookHref(opts: { location?: string | null; doctor?: string | null; service?: string | null } = {}): string {
	const q = new URLSearchParams();
	if (opts.location) q.set('location', opts.location);
	if (opts.doctor) q.set('doctor', opts.doctor);
	if (opts.service) q.set('service', opts.service);
	const s = q.toString();
	return s ? `/book?${s}` : '/book';
}

export function doctorName(d: { title?: string | null; name: string }): string {
	return d.title ? `${d.title} ${d.name}` : d.name;
}
