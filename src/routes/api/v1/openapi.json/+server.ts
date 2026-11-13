import { json } from '@sveltejs/kit';
import { corsHeaders } from '#lib/server/api/auth.js';
import { API_SCOPES } from '#lib/server/api/auth.js';
import { WEBHOOK_EVENTS } from '#lib/server/integrations/events.js';
import type { RequestHandler } from './$types';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const ok = (schema: object, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const errors = {
	'401': { $ref: '#/components/responses/Unauthorized' },
	'403': { $ref: '#/components/responses/Forbidden' },
	'429': { $ref: '#/components/responses/RateLimited' }
};
const slugParam = { name: 'slug', in: 'path', required: true, schema: { type: 'string' } };
const dataOf = (schema: object) => ({ type: 'object', properties: { data: schema } });
const listOf = (name: string) => dataOf({ type: 'array', items: ref(name) });
const scope = (s: keyof typeof API_SCOPES) => [{ apiKey: [s] }];

export const GET: RequestHandler = (event) => {
	const { url, locals } = event;
	const spec = {
		openapi: '3.1.0',
		info: {
			title: `${locals.settings.clinic.name} API`,
			version: '1.0.0',
			description:
				'Read clinic information and availability, create appointment requests, and manage appointments. ' +
				'Authenticate with an API key created in Admin → Integrations & API: `Authorization: Bearer ck_…`. ' +
				'Rate limit: 600 requests / 10 minutes per key. Times are ISO-8601 (UTC) unless stated; dates (YYYY-MM-DD) and HH:MM hours are in the clinic time zone.\n\n' +
				`Webhooks (registered in admin) receive POSTs for: ${WEBHOOK_EVENTS.join(', ')}. ` +
				'Body: `{ id, event, createdAt, data }`. Verify `X-Webhook-Signature: t=<unix>,v1=<hex>` where v1 = HMAC-SHA256(secret, "<t>.<raw body>").'
		},
		servers: [{ url: `${url.origin}/api/v1` }],
		components: {
			securitySchemes: {
				apiKey: { type: 'http', scheme: 'bearer', description: `Scopes: ${Object.entries(API_SCOPES).map(([k, v]) => `\`${k}\` — ${v}`).join('; ')}` }
			},
			responses: {
				Unauthorized: ok(ref('Error'), 'Missing or invalid API key'),
				Forbidden: ok(ref('Error'), 'Key lacks the required scope'),
				RateLimited: ok(ref('Error'), 'Too many requests'),
				NotFound: ok(ref('Error'), 'Not found'),
				Invalid: ok(ref('Error'), 'Validation failed (see error.fields)')
			},
			schemas: {
				Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, fields: { type: 'object', additionalProperties: { type: 'string' } } } } } },
				TimeRange: { type: 'object', properties: { open: { type: 'string', example: '09:30' }, close: { type: 'string', example: '13:30' } } },
				WeeklyHours: { type: 'object', description: 'Keys mon…sun; missing day = closed', additionalProperties: { type: 'array', items: ref('TimeRange') } },
				Location: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						slug: { type: 'string' },
						name: { type: 'string' },
						type: { type: 'string' },
						address: { type: 'object', properties: { line1: { type: 'string' }, line2: { type: ['string', 'null'] }, area: { type: ['string', 'null'] }, city: { type: 'string' }, state: { type: ['string', 'null'] }, postalCode: { type: ['string', 'null'] }, formatted: { type: 'string' } } },
						phones: { type: 'array', items: { type: 'string' } },
						whatsapp: { type: ['string', 'null'] },
						email: { type: ['string', 'null'] },
						geo: { type: ['object', 'null'], properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
						directionsUrl: { type: ['string', 'null'] },
						hours: ref('WeeklyHours'),
						closures: { type: 'array', items: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' }, reason: { type: ['string', 'null'] } } } },
						url: { type: 'string' },
						bookingUrl: { type: 'string' }
					}
				},
				Doctor: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						slug: { type: 'string' },
						name: { type: 'string' },
						qualifications: { type: ['string', 'null'] },
						specialities: { type: 'array', items: { type: 'string' } },
						languages: { type: 'array', items: { type: 'string' } },
						experienceYears: { type: ['integer', 'null'] },
						locations: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, slug: { type: 'string' }, name: { type: 'string' }, schedule: ref('WeeklyHours'), bookable: { type: 'boolean' } } } },
						url: { type: 'string' },
						bookingUrl: { type: 'string' }
					}
				},
				Service: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						slug: { type: 'string' },
						name: { type: 'string' },
						category: { type: ['string', 'null'] },
						summary: { type: ['string', 'null'] },
						durationMinutes: { type: ['integer', 'null'] },
						price: { type: ['object', 'null'], properties: { amount: { type: 'integer' }, from: { type: 'boolean' } } },
						locationIds: { type: 'array', items: { type: 'string' } },
						url: { type: 'string' },
						bookingUrl: { type: 'string' }
					}
				},
				Appointment: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						reference: { type: 'string', example: 'OD-7K3M9Q' },
						status: { type: 'string', enum: ['new', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'] },
						source: { type: 'string', enum: ['web', 'phone', 'api', 'chatbot'] },
						location: { type: 'object', properties: { id: { type: 'string' }, slug: { type: 'string' }, name: { type: 'string' } } },
						doctor: { type: ['object', 'null'] },
						service: { type: ['object', 'null'] },
						preferredDate: { type: 'string', format: 'date' },
						timeWindow: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'slot'] },
						slotStart: { type: ['string', 'null'], format: 'date-time' },
						slotEnd: { type: ['string', 'null'], format: 'date-time' },
						patient: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: ['string', 'null'] } } },
						notes: { type: ['string', 'null'] },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' }
					}
				},
				CreateAppointment: {
					type: 'object',
					required: ['location', 'date', 'patient', 'consent'],
					properties: {
						location: { type: 'string', description: 'Location id or slug' },
						doctor: { type: 'string', description: 'Doctor id or slug (optional)' },
						service: { type: 'string', description: 'Service id or slug (optional)' },
						date: { type: 'string', format: 'date' },
						timeWindow: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Request mode' },
						slotStart: { type: 'string', format: 'date-time', description: 'Live-slot mode: a start from /availability' },
						patient: { type: 'object', required: ['name', 'phone'], properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } } },
						notes: { type: 'string' },
						consent: { type: 'boolean', const: true, description: 'Patient consented to data processing (DPDP Act 2023)' },
						source: { type: 'string', enum: ['api', 'chatbot'], default: 'api' }
					}
				}
			}
		},
		paths: {
			'/site': { get: { summary: 'Clinic overview, booking deep-link format', security: scope('read'), responses: { '200': ok({ type: 'object' }), ...errors } } },
			'/locations': { get: { summary: 'Active locations', security: scope('read'), responses: { '200': ok(listOf('Location')), ...errors } } },
			'/locations/{slug}': {
				parameters: [slugParam],
				get: { summary: 'One location with its doctors and services', security: scope('read'), responses: { '200': ok(dataOf(ref('Location'))), '404': { $ref: '#/components/responses/NotFound' }, ...errors } },
				patch: {
					summary: 'Update a location',
					security: scope('content:write'),
					requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { active: { type: 'boolean' }, summary: { type: 'string' }, phones: { type: 'array', items: { type: 'string' } }, whatsapp: { type: ['string', 'null'] }, email: { type: ['string', 'null'] }, hours: ref('WeeklyHours') } } } } },
					responses: { '200': ok({ type: 'object' }), '422': { $ref: '#/components/responses/Invalid' }, ...errors }
				}
			},
			'/doctors': { get: { summary: 'Active doctors', parameters: [{ name: 'location', in: 'query', schema: { type: 'string' }, description: 'Location slug' }], security: scope('read'), responses: { '200': ok(listOf('Doctor')), ...errors } } },
			'/doctors/{slug}': {
				parameters: [slugParam],
				get: { summary: 'One doctor', security: scope('read'), responses: { '200': ok(dataOf(ref('Doctor'))), '404': { $ref: '#/components/responses/NotFound' }, ...errors } },
				patch: {
					summary: 'Update a doctor',
					security: scope('content:write'),
					requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { active: { type: 'boolean' }, featured: { type: 'boolean' }, summary: { type: 'string' }, qualifications: { type: 'string' }, specialities: { type: 'array', items: { type: 'string' } }, languages: { type: 'array', items: { type: 'string' } }, experienceYears: { type: 'integer' } } } } } },
					responses: { '200': ok({ type: 'object' }), '422': { $ref: '#/components/responses/Invalid' }, ...errors }
				}
			},
			'/services': { get: { summary: 'Active services', security: scope('read'), responses: { '200': ok(listOf('Service')), ...errors } } },
			'/services/{slug}': {
				parameters: [slugParam],
				get: { summary: 'One service', security: scope('read'), responses: { '200': ok(dataOf(ref('Service'))), ...errors } },
				patch: { summary: 'Update a service', security: scope('content:write'), requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { active: { type: 'boolean' }, summary: { type: 'string' }, durationMinutes: { type: ['integer', 'null'] }, price: { type: ['integer', 'null'] }, priceFrom: { type: 'boolean' } } } } } }, responses: { '200': ok({ type: 'object' }), ...errors } }
			},
			'/faqs': { get: { summary: 'Frequently asked questions', security: scope('read'), responses: { '200': ok({ type: 'object' }), ...errors } } },
			'/availability': {
				get: {
					summary: 'Bookable days (request mode) or exact slots (live-slot mode, with date)',
					security: scope('read'),
					parameters: [
						{ name: 'location', in: 'query', required: true, schema: { type: 'string' }, description: 'Location slug' },
						{ name: 'doctor', in: 'query', schema: { type: 'string' }, description: 'Doctor slug' },
						{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
						{ name: 'service', in: 'query', schema: { type: 'string' }, description: 'Service id (slot length)' }
					],
					responses: { '200': ok({ type: 'object', properties: { mode: { type: 'string' }, timeZone: { type: 'string' }, days: { type: 'array' }, slots: { type: 'array' } } }), ...errors }
				}
			},
			'/appointments': {
				post: {
					summary: 'Create an appointment request (same rules as the booking form)',
					security: scope('appointments:create'),
					requestBody: { required: true, content: { 'application/json': { schema: ref('CreateAppointment') } } },
					responses: { '201': ok(dataOf(ref('Appointment')), 'Created'), '409': ok(ref('Error'), 'Slot already taken'), '422': { $ref: '#/components/responses/Invalid' }, ...errors }
				},
				get: {
					summary: 'List appointments (contains patient data)',
					security: scope('appointments:read'),
					parameters: [
						{ name: 'status', in: 'query', schema: { type: 'string' } },
						{ name: 'location', in: 'query', schema: { type: 'string' } },
						{ name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
						{ name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
						{ name: 'updatedSince', in: 'query', schema: { type: 'string', format: 'date-time' } },
						{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
						{ name: 'limit', in: 'query', schema: { type: 'integer', maximum: 200 } }
					],
					responses: { '200': ok({ type: 'object', properties: { data: { type: 'array', items: ref('Appointment') }, page: { type: 'integer' }, hasMore: { type: 'boolean' } } }), ...errors }
				}
			},
			'/appointments/{id}': {
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Id or reference' }],
				get: { summary: 'One appointment', security: scope('appointments:read'), responses: { '200': ok(dataOf(ref('Appointment'))), ...errors } },
				patch: {
					summary: 'Update status/date (e.g. from your practice software)',
					security: scope('appointments:write'),
					requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, preferredDate: { type: 'string', format: 'date' }, timeWindow: { type: 'string' }, externalId: { type: ['string', 'null'] }, note: { type: 'string' }, notifyPatient: { type: 'boolean' } } } } } },
					responses: { '200': ok(dataOf(ref('Appointment'))), ...errors }
				}
			}
		}
	};
	return json(spec, { headers: { ...corsHeaders(event), 'cache-control': 'public, max-age=300' } });
};
