/** Validation shared by public forms (client hints) and the server (authoritative). */
import { z } from 'zod';

export const nameSchema = z.string().trim().min(2, 'Please enter your name').max(100, 'Name is too long');
export const optionalEmail = z
	.string()
	.trim()
	.max(200)
	.refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Please enter a valid email address')
	.optional()
	.default('');

export function phoneSchema(pattern: string, hint: string) {
	let re: RegExp;
	try {
		re = new RegExp(pattern);
	} catch {
		re = /^\+?[\d\s-]{7,20}$/;
	}
	return z
		.string()
		.trim()
		.max(30)
		.refine((v) => re.test(v), `Please enter a valid mobile number (${hint})`);
}

export const consentSchema = z.literal('on', { error: 'Please tick the box to agree before sending' });

export function contactSchema(phonePattern: string, phoneHint: string) {
	return z.object({
		name: nameSchema,
		phone: phoneSchema(phonePattern, phoneHint).or(z.literal('')).default(''),
		email: optionalEmail,
		locationId: z.string().max(60).optional().default(''),
		message: z.string().trim().min(5, 'Please write a short message').max(3000, 'Message is too long'),
		consent: consentSchema,
		website: z.string().max(0, 'Spam detected').optional().default('') // honeypot
	});
}
