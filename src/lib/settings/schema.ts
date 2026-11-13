/**
 * Clinic settings. Each top-level key is stored as one row in the `settings` table.
 * Every field has a default, so a fresh database renders a working site.
 */
import { z } from 'zod';

const str = (d = '') => z.string().trim().max(2000).default(d);
const optStr = () => z.string().trim().max(2000).optional().default('');
const imageRef = z
	.object({
		url: z.string(),
		alt: z.string().default(''),
		width: z.number().nullish(),
		height: z.number().nullish(),
		mediaId: z.string().nullish()
	})
	.nullable()
	.default(null);
const color = (d: string) =>
	z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #0f766e')
		.default(d);

export const CLINIC_TYPES = ['dental', 'eye', 'skin', 'general', 'physio', 'other'] as const;
export type ClinicType = (typeof CLINIC_TYPES)[number];

/** Curated Google Fonts (all have regular + semibold/bold weights). */
export const FONT_CHOICES = [
	'Inter',
	'DM Sans',
	'Manrope',
	'Nunito Sans',
	'Plus Jakarta Sans',
	'Outfit',
	'Lato',
	'Source Sans 3',
	'Work Sans',
	'Poppins',
	'Mulish',
	'Figtree',
	'Fraunces',
	'Lora',
	'Playfair Display',
	'DM Serif Display',
	'Merriweather',
	'Libre Baskerville',
	'Cormorant Garamond',
	'Newsreader'
] as const;

export const clinicSchema = z.object({
	name: str('Your Clinic'),
	shortName: optStr(),
	tagline: optStr(),
	clinicType: z.enum(CLINIC_TYPES).default('dental'),
	logo: imageRef,
	logoDark: imageRef,
	favicon: imageRef,
	phones: z.array(z.string().trim().max(40)).max(5).default([]),
	whatsapp: optStr(),
	email: optStr(),
	social: z
		.object({
			facebook: optStr(),
			instagram: optStr(),
			youtube: optStr(),
			linkedin: optStr(),
			x: optStr(),
			google: optStr()
		})
		.prefault({}),
	googleReviewsUrl: optStr(),
	foundedYear: z.number().int().min(1800).max(2100).nullable().default(null),
	timeZone: str('Asia/Kolkata'),
	currency: str('INR'),
	locale: str('en-IN'),
	/** Two-letter country code used for phone validation in forms. */
	country: str('IN')
});

export const themeSchema = z.object({
	primary: color('#0a7d8c'),
	secondary: color('#16216b'),
	accent: color('#ff7a59'),
	background: color('#f4fbfb'),
	/** Cards and panels on the public site (branch, doctor, service, review cards…). */
	card: color('#ffffff'),
	headingFont: z.string().default('Fraunces'),
	bodyFont: z.string().default('DM Sans'),
	radius: z.enum(['square', 'soft', 'round']).default('soft')
});

export const labelsSchema = z.object({
	doctors: str('Doctors'),
	doctor: str('Doctor'),
	services: str('Services'),
	service: str('Service'),
	locations: str('Locations'),
	location: str('Location'),
	patients: str('Patients'),
	patient: str('Patient'),
	certifications: str('Certifications'),
	bookCta: str('Book Appointment')
});

export const MODULE_KEYS = [
	'booking',
	'doctors',
	'services',
	'locations',
	'certifications',
	'testimonials',
	'gallery',
	'faq',
	'technology',
	'amenities',
	'blog',
	'chatbot',
	'banner',
	'insurance',
	'membership'
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
	booking: 'Appointment booking',
	doctors: 'Doctors',
	services: 'Services',
	locations: 'Locations',
	certifications: 'Certifications',
	testimonials: 'Testimonials',
	gallery: 'Gallery',
	faq: 'FAQ',
	technology: 'Technology',
	amenities: 'Amenities',
	blog: 'Blog / articles',
	chatbot: 'Chatbot',
	banner: 'Notice / emergency banner',
	insurance: 'Insurance & payment info',
	membership: 'Membership plans'
};

export const modulesSchema = z.object(
	Object.fromEntries(
		MODULE_KEYS.map((k) => [
			k,
			z.boolean().default(!['chatbot', 'blog', 'gallery', 'membership', 'banner'].includes(k))
		])
	) as Record<ModuleKey, z.ZodDefault<z.ZodBoolean>>
);

export const HOMEPAGE_SECTIONS = [
	'hero',
	'intents',
	'services',
	'process',
	'doctors',
	'locations',
	'certifications',
	'technology',
	'amenities',
	'testimonials',
	'insurance',
	'membership',
	'faq',
	'cta'
] as const;
export type HomepageSectionId = (typeof HOMEPAGE_SECTIONS)[number];

/** Which module must be on for a homepage section to render. */
export const SECTION_MODULE: Partial<Record<HomepageSectionId, ModuleKey>> = {
	services: 'services',
	doctors: 'doctors',
	locations: 'locations',
	certifications: 'certifications',
	technology: 'technology',
	amenities: 'amenities',
	testimonials: 'testimonials',
	insurance: 'insurance',
	membership: 'membership',
	faq: 'faq'
};

export const SECTION_DEFAULTS: Record<HomepageSectionId, { heading: string; intro: string; eyebrow: string }> = {
	hero: { eyebrow: '', heading: 'Hero slideshow', intro: '' },
	intents: { eyebrow: 'Start here', heading: 'What brings you in?', intro: '' },
	services: {
		eyebrow: 'What we do',
		heading: 'Care for every stage of life',
		intro: 'From routine check-ups to complete treatment plans, explained clearly and delivered gently.'
	},
	process: {
		eyebrow: 'How we care',
		heading: 'Unhurried, honest care',
		intro: 'Every visit follows the same simple steps, so you always know what comes next.'
	},
	doctors: {
		eyebrow: 'Meet the team',
		heading: 'Experienced hands, kind hearts',
		intro: ''
	},
	locations: {
		eyebrow: 'Visit us',
		heading: 'Find a branch near you',
		intro: ''
	},
	certifications: {
		eyebrow: 'Trusted',
		heading: 'Certified and accredited',
		intro: ''
	},
	technology: { eyebrow: 'Technology', heading: 'Modern equipment, gentler treatment', intro: '' },
	amenities: { eyebrow: 'Comfort', heading: 'Thoughtful touches', intro: '' },
	testimonials: { eyebrow: 'Kind words', heading: 'What our patients say', intro: '' },
	insurance: { eyebrow: 'Payments', heading: 'Insurance & payment options', intro: '' },
	membership: { eyebrow: 'Plans', heading: 'Membership plans', intro: '' },
	faq: { eyebrow: 'Questions', heading: 'Frequently asked questions', intro: '' },
	cta: {
		eyebrow: '',
		heading: 'Ready when you are',
		intro: 'Request an appointment online or give us a call — we will take care of the rest.'
	}
};

export const homepageSectionSchema = z.object({
	id: z.enum(HOMEPAGE_SECTIONS),
	enabled: z.boolean().default(true),
	eyebrow: z.string().max(80).default(''),
	heading: z.string().max(160).default(''),
	intro: z.string().max(600).default(''),
	/** Optional section photo (used by "How we care"). */
	image: imageRef
});
export type HomepageSection = z.infer<typeof homepageSectionSchema>;

export const homepageSchema = z.object({
	sections: z
		.array(homepageSectionSchema)
		.default(() =>
			HOMEPAGE_SECTIONS.map((id) => ({
				id,
				enabled: !['membership', 'insurance'].includes(id),
				...SECTION_DEFAULTS[id],
				image: null
			}))
		)
});

export const heroSchema = z.object({
	intervalSeconds: z.number().min(2).max(30).default(6),
	transitionMs: z.number().min(200).max(3000).default(1200),
	pauseOnHover: z.boolean().default(true),
	showDots: z.boolean().default(true),
	showArrows: z.boolean().default(true)
});

export const bannerSchema = z.object({
	text: optStr(),
	linkText: optStr(),
	linkUrl: optStr(),
	tone: z.enum(['info', 'warning', 'emergency']).default('info'),
	dismissible: z.boolean().default(true)
});

export const disclaimerSchema = z.object({
	enabled: z.boolean().default(false),
	text: str(
		'We do not take bookings through third-party websites or apps. Please book only through this website or by calling our official numbers below.'
	)
});

export const bookingSchema = z.object({
	/** request = staff call back (default). slots = patients pick exact times. */
	mode: z.enum(['request', 'slots']).default('request'),
	slotMinutes: z.number().int().min(5).max(240).default(30),
	minNoticeHours: z.number().int().min(0).max(24 * 14).default(2),
	maxDaysAhead: z.number().int().min(1).max(365).default(60),
	showServiceDropdown: z.boolean().default(true),
	requireEmail: z.boolean().default(false),
	/** Regex (as string) for mobile numbers. Default: Indian mobile (10 digits starting 6-9, optional +91/0). */
	phonePattern: str('^(?:\\+?91[\\s-]?|0)?[6-9]\\d{4}[\\s-]?\\d{5}$'),
	phoneHint: str('10-digit mobile number'),
	thankYouHeading: str('Thank you — we have your request'),
	thankYouMessage: str(
		'Our team will call you shortly to confirm a convenient time. If you need help sooner, call or WhatsApp the branch.'
	),
	consentText: str(
		'I agree to the clinic processing my details to arrange this appointment, as described in the privacy policy.'
	),
	/** Rate limits for public submissions. */
	maxPerIpPerHour: z.number().int().min(1).max(1000).default(10),
	maxPerPhonePerDay: z.number().int().min(1).max(100).default(3)
});

export const notificationsSchema = z.object({
	emailBranch: z.boolean().default(true),
	emailPatient: z.boolean().default(true),
	/** Fallback recipient when a branch has no notification email. */
	adminEmail: optStr(),
	whatsappTemplate: str(
		'Hello {name}, this is {clinic}. We received your appointment request ({reference}) for {location}. '
	)
});

export const emailSchema = z.object({
	provider: z.enum(['none', 'resend', 'smtp']).default('none'),
	from: optStr(),
	replyTo: optStr(),
	resendApiKey: optStr(),
	smtpHost: optStr(),
	smtpPort: z.number().int().default(587),
	smtpUser: optStr(),
	smtpPass: optStr(),
	smtpSecure: z.boolean().default(false)
});

export const securitySchema = z.object({
	turnstileSiteKey: optStr(),
	turnstileSecretKey: optStr()
});

export const analyticsSchema = z.object({
	ga4Id: z
		.string()
		.trim()
		.regex(/^(G-[A-Z0-9]{4,20})?$/, 'GA4 IDs look like G-XXXXXXX')
		.default('')
});

export const seoSchema = z.object({
	titleTemplate: str('%s | {clinic}'),
	defaultTitle: optStr(),
	defaultDescription: optStr(),
	ogImage: optStr(),
	allowIndexing: z.boolean().default(true)
});

export const chatbotSchema = z.object({
	provider: z.enum(['none', 'embed', 'endpoint']).default('none'),
	embedCode: z.string().max(10000).default(''),
	endpointUrl: optStr(),
	apiKey: optStr(),
	title: str('Ask us anything'),
	greeting: str('Hello! How can we help you today?'),
	buttonLabel: str('Chat with us')
});

export const integrationsSchema = z.object({
	/** Id of the IntegrationProvider adapter (see src/lib/server/integrations). */
	provider: z.string().default('none'),
	providerConfig: z.record(z.string(), z.string()).default({}),
	/** Use the provider's availability instead of local schedules. */
	useProviderAvailability: z.boolean().default(false),
	whatsappCloud: z
		.object({
			enabled: z.boolean().default(false),
			phoneNumberId: optStr(),
			accessToken: optStr(),
			templateName: optStr(),
			templateLanguage: str('en')
		})
		.prefault({}),
	sms: z
		.object({
			enabled: z.boolean().default(false),
			provider: z.enum(['none', 'webhook']).default('none'),
			webhookUrl: optStr(),
			authToken: optStr()
		})
		.prefault({}),
	/** Comma-separated origins allowed to call the public API from browsers. */
	corsOrigins: optStr()
});

export const locationTypesSchema = z.object({
	types: z
		.array(z.string().trim().min(1).max(40))
		.default(['Head Office', 'Main Branch', 'Branch', 'Satellite Clinic', 'Partner'])
});

export const settingsSchemas = {
	clinic: clinicSchema,
	theme: themeSchema,
	labels: labelsSchema,
	modules: modulesSchema,
	homepage: homepageSchema,
	hero: heroSchema,
	banner: bannerSchema,
	disclaimer: disclaimerSchema,
	booking: bookingSchema,
	notifications: notificationsSchema,
	email: emailSchema,
	security: securitySchema,
	analytics: analyticsSchema,
	seo: seoSchema,
	chatbot: chatbotSchema,
	integrations: integrationsSchema,
	locationTypes: locationTypesSchema
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type Settings = { [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]> };

/** Fields that must never be sent to the browser or shown back in forms. */
export const SECRET_FIELDS: { [K in SettingsKey]?: string[] } = {
	email: ['resendApiKey', 'smtpPass'],
	security: ['turnstileSecretKey'],
	chatbot: ['apiKey'],
	integrations: ['whatsappCloud.accessToken', 'sms.authToken', 'providerConfig']
};

/** Who may edit each group. Everything not listed needs super_admin. */
export const CONTENT_SETTINGS: SettingsKey[] = ['homepage', 'hero', 'banner', 'disclaimer'];
/** Groups on the Colours & branding page — clinic admins may edit these too. */
export const BRANDING_SETTINGS: SettingsKey[] = ['clinic', 'theme'];

export function defaultSettings(): Settings {
	const out = {} as Record<string, unknown>;
	for (const [key, schema] of Object.entries(settingsSchemas)) out[key] = schema.parse({});
	return out as Settings;
}

export function parseSettingsGroup<K extends SettingsKey>(key: K, value: unknown): Settings[K] {
	const schema = settingsSchemas[key];
	const result = schema.safeParse(value ?? {});
	if (result.success) return result.data as Settings[K];
	// Fall back field-by-field: keep valid stored fields, default the rest.
	const defaults = schema.parse({}) as Record<string, unknown>;
	if (value && typeof value === 'object') {
		for (const [field, v] of Object.entries(value as Record<string, unknown>)) {
			const attempt = schema.safeParse({ ...defaults, [field]: v });
			if (attempt.success) defaults[field] = v;
		}
	}
	return schema.parse(defaults) as Settings[K];
}

/** Labels per clinic type (applied when the type changes or a profile is seeded). */
export const TYPE_LABELS: Record<ClinicType, Partial<z.infer<typeof labelsSchema>>> = {
	dental: { doctors: 'Dentists', doctor: 'Dentist', services: 'Treatments', service: 'Treatment' },
	eye: { doctors: 'Specialists', doctor: 'Specialist', services: 'Treatments', service: 'Treatment' },
	skin: {
		doctors: 'Dermatologists',
		doctor: 'Dermatologist',
		services: 'Treatments',
		service: 'Treatment'
	},
	general: { doctors: 'Doctors', doctor: 'Doctor', services: 'Services', service: 'Service' },
	physio: {
		doctors: 'Physiotherapists',
		doctor: 'Physiotherapist',
		services: 'Therapies',
		service: 'Therapy'
	},
	other: { doctors: 'Specialists', doctor: 'Specialist', services: 'Services', service: 'Service' }
};
