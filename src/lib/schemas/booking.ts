import { z } from 'zod';
import { nameSchema, optionalEmail, phoneSchema } from './public.js';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a date');

/**
 * One schema for every way an appointment is created: the public form, staff taking a
 * request by phone, and the public API. `consent` is required for patients; staff/API
 * set it explicitly.
 */
export function bookingSchema(opts: { phonePattern: string; phoneHint: string; requireEmail?: boolean }) {
	return z
		.object({
			locationId: z.string().min(1, 'Please choose a branch').max(60),
			doctorId: z.string().max(60).optional().default(''),
			serviceId: z.string().max(60).optional().default(''),
			date: ymd,
			timeWindow: z.enum(['morning', 'afternoon', 'evening', 'slot'], { error: 'Please choose a time' }),
			/** UTC ms as a string when timeWindow = 'slot' */
			slot: z
				.union([z.literal(''), z.string().regex(/^\d{12,14}$/, 'Please choose a time')])
				.optional()
				.default(''),
			name: nameSchema,
			phone: phoneSchema(opts.phonePattern, opts.phoneHint),
			email: opts.requireEmail ? z.string().trim().email('Please enter a valid email address') : optionalEmail,
			notes: z.string().trim().max(1000, 'Please keep notes under 1000 characters').optional().default(''),
			consent: z.union([z.literal('on'), z.literal('true'), z.literal(true)], { error: 'Please tick the box to agree before sending' }),
			website: z.string().max(0).optional().default('') // honeypot
		})
		.refine((d) => d.timeWindow !== 'slot' || !!d.slot, { path: ['slot'], message: 'Please choose a time' });
}
export type BookingInput = z.output<ReturnType<typeof bookingSchema>>;
