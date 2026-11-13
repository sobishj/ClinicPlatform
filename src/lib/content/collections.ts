/**
 * Simple content collections stored in the `blocks` table. Each collection is a list of
 * flat records whose fields are declared here; the admin form and the Zod validation are
 * generated from this config, so adding a collection needs no new admin code.
 */
import { z } from 'zod';
import type { ModuleKey } from '../settings/schema.js';

export type FieldType =
	| 'text'
	| 'textarea'
	| 'richtext'
	| 'number'
	| 'rating'
	| 'boolean'
	| 'image'
	| 'icon'
	| 'date'
	| 'url'
	| 'list'
	| 'links'
	| 'select';

export interface FieldDef {
	name: string;
	label: string;
	type: FieldType;
	required?: boolean;
	hint?: string;
	options?: string[];
	max?: number;
}

export interface CollectionDef {
	key: string;
	label: string;
	singular: string;
	description: string;
	module?: ModuleKey;
	/** Field used as the row title in admin lists. */
	titleField: string;
	fields: FieldDef[];
}

export const COLLECTIONS = {
	intents: {
		key: 'intents',
		label: 'Intent cards',
		singular: 'Intent card',
		description: '"What brings you in?" cards on the homepage (3–4 work best).',
		titleField: 'title',
		fields: [
			{ name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
			{ name: 'description', label: 'Description', type: 'textarea', max: 300 },
			{ name: 'icon', label: 'Icon', type: 'icon' },
			{
				name: 'links',
				label: 'Links',
				type: 'links',
				hint: 'Up to 3 links. Use /book?service=… or /services/… for internal pages.'
			}
		]
	},
	process: {
		key: 'process',
		label: 'Care process steps',
		singular: 'Step',
		description: 'Numbered steps shown in the "How we care" section.',
		titleField: 'title',
		fields: [
			{ name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
			{ name: 'description', label: 'Description', type: 'textarea', max: 400 }
		]
	},
	technology: {
		key: 'technology',
		label: 'Technology',
		singular: 'Technology item',
		description: 'Equipment and techniques worth highlighting.',
		module: 'technology',
		titleField: 'title',
		fields: [
			{ name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
			{ name: 'description', label: 'Description', type: 'textarea', max: 300 },
			{ name: 'icon', label: 'Icon', type: 'icon' }
		]
	},
	amenities: {
		key: 'amenities',
		label: 'Amenities',
		singular: 'Amenity',
		description: 'Comfort features such as parking, Wi-Fi, wheelchair access.',
		module: 'amenities',
		titleField: 'title',
		fields: [
			{ name: 'title', label: 'Title', type: 'text', required: true, max: 60 },
			{ name: 'icon', label: 'Icon', type: 'icon' }
		]
	},
	testimonials: {
		key: 'testimonials',
		label: 'Testimonials',
		singular: 'Testimonial',
		description: 'Reviews entered manually (copy them from Google with the patient’s permission).',
		module: 'testimonials',
		titleField: 'name',
		fields: [
			{ name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
			{ name: 'rating', label: 'Rating', type: 'rating' },
			{ name: 'text', label: 'Review', type: 'textarea', required: true, max: 1200 },
			{ name: 'source', label: 'Source', type: 'select', options: ['Google', 'Practo', 'Facebook', 'In person', 'Other'] },
			{ name: 'date', label: 'Date', type: 'date' },
			{ name: 'url', label: 'Link to review', type: 'url' }
		]
	},
	faqs: {
		key: 'faqs',
		label: 'FAQs',
		singular: 'FAQ',
		description: 'Questions shown on the homepage FAQ and contact page.',
		module: 'faq',
		titleField: 'question',
		fields: [
			{ name: 'question', label: 'Question', type: 'text', required: true, max: 200 },
			{ name: 'answer', label: 'Answer', type: 'richtext', required: true },
			{ name: 'category', label: 'Category', type: 'text', max: 60 }
		]
	},
	gallery: {
		key: 'gallery',
		label: 'Gallery',
		singular: 'Gallery image',
		description: 'Photos of the clinic, team and facilities.',
		module: 'gallery',
		titleField: 'caption',
		fields: [
			{ name: 'image', label: 'Image', type: 'image', required: true },
			{ name: 'caption', label: 'Caption', type: 'text', max: 160 },
			{ name: 'category', label: 'Category', type: 'text', max: 60 }
		]
	},
	insurance: {
		key: 'insurance',
		label: 'Insurance & payment',
		singular: 'Payment option',
		description: 'Accepted insurers, payment methods and finance options.',
		module: 'insurance',
		titleField: 'title',
		fields: [
			{ name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
			{ name: 'description', label: 'Description', type: 'textarea', max: 400 },
			{ name: 'icon', label: 'Icon', type: 'icon' }
		]
	},
	membership: {
		key: 'membership',
		label: 'Membership plans',
		singular: 'Plan',
		description: 'In-house membership or care plans.',
		module: 'membership',
		titleField: 'name',
		fields: [
			{ name: 'name', label: 'Plan name', type: 'text', required: true, max: 80 },
			{ name: 'price', label: 'Price', type: 'text', hint: 'e.g. ₹2,999', max: 40 },
			{ name: 'period', label: 'Period', type: 'text', hint: 'e.g. per year', max: 40 },
			{ name: 'description', label: 'Description', type: 'textarea', max: 300 },
			{ name: 'features', label: 'What’s included', type: 'list' },
			{ name: 'highlighted', label: 'Highlight this plan', type: 'boolean' },
			{ name: 'ctaText', label: 'Button text', type: 'text', max: 40 },
			{ name: 'ctaLink', label: 'Button link', type: 'text', max: 300 }
		]
	}
} as const satisfies Record<string, CollectionDef>;

export type CollectionKey = keyof typeof COLLECTIONS;
export const COLLECTION_KEYS = Object.keys(COLLECTIONS) as CollectionKey[];

export function isCollectionKey(k: string): k is CollectionKey {
	return k in COLLECTIONS;
}

const imageRefSchema = z.object({
	url: z.string().min(1),
	alt: z.string().trim().min(1, 'Alt text is required'),
	width: z.number().nullish(),
	height: z.number().nullish(),
	mediaId: z.string().nullish()
});

const safeHref = z
	.string()
	.trim()
	.max(500)
	.refine((v) => v === '' || /^(\/|#|https?:\/\/|tel:|mailto:)/i.test(v), 'Links must start with /, https://, tel: or mailto:');

function fieldSchema(f: FieldDef): z.ZodType {
	let s: z.ZodType;
	switch (f.type) {
		case 'number':
			s = z.coerce.number();
			break;
		case 'rating':
			s = z.coerce.number().int().min(1).max(5).default(5);
			break;
		case 'boolean':
			s = z.boolean().default(false);
			break;
		case 'image':
			s = f.required ? imageRefSchema : imageRefSchema.nullable().default(null);
			return s;
		case 'list':
			s = z.array(z.string().trim().min(1).max(200)).max(30).default([]);
			return s;
		case 'links':
			s = z
				.array(z.object({ label: z.string().trim().min(1).max(60), href: safeHref }))
				.max(3)
				.default([]);
			return s;
		case 'url':
			s = safeHref.default('');
			return s;
		case 'select':
			s = z.string().trim().max(60).default(f.options?.[0] ?? '');
			return s;
		default: {
			let str = z.string().trim().max(f.max ?? (f.type === 'richtext' ? 20000 : 2000));
			if (f.required) str = str.min(1, `${f.label} is required`);
			return f.required ? str : str.default('');
		}
	}
	return s;
}

export function collectionSchema(key: CollectionKey) {
	const def: CollectionDef = COLLECTIONS[key];
	return z.object(Object.fromEntries(def.fields.map((f) => [f.name, fieldSchema(f)])));
}

export function emptyRecord(key: CollectionKey): Record<string, unknown> {
	const def: CollectionDef = COLLECTIONS[key];
	const out: Record<string, unknown> = {};
	for (const f of def.fields) {
		out[f.name] =
			f.type === 'boolean'
				? false
				: f.type === 'rating'
					? 5
					: f.type === 'list' || f.type === 'links'
						? []
						: f.type === 'image'
							? null
							: f.type === 'select'
								? (f.options?.[0] ?? '')
								: '';
	}
	return out;
}
