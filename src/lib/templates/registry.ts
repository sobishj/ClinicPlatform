/**
 * Site templates. Each template is a folder under /templates/<category>/<template>/ with a
 * manifest.json; folders are discovered at build time, so adding one needs no code change
 * here (only a rebuild). The current site design is "dental/template-1".
 */
import { z } from 'zod';
import { CLINIC_TYPES } from '../settings/schema.js';

export const templateManifestSchema = z.object({
	key: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, 'key must look like "category/template"'),
	category: z.object({ key: z.string().min(1), name: z.string().min(1) }),
	name: z.string().min(1),
	description: z.string().default(''),
	version: z.number().int().positive().default(1),
	/** Sample content profile used to seed a new client (see server/tenancy/profiles). */
	sampleProfile: z.enum(CLINIC_TYPES),
	pages: z.array(z.object({ key: z.string(), title: z.string(), path: z.string() })).default([]),
	homeSections: z.array(z.string()).default([])
});
export type TemplateManifest = z.infer<typeof templateManifestSchema>;

const files = import.meta.glob<unknown>('/templates/*/*/manifest.json', {
	eager: true,
	import: 'default'
});

function load(): TemplateManifest[] {
	const out: TemplateManifest[] = [];
	for (const [file, raw] of Object.entries(files)) {
		const parsed = templateManifestSchema.safeParse(raw);
		if (!parsed.success)
			throw new Error(`Invalid template manifest ${file}: ${parsed.error.issues[0].message}`);
		const folder = file.split('/').slice(2, 4).join('/');
		if (parsed.data.key !== folder)
			throw new Error(
				`Template ${file}: key "${parsed.data.key}" must match its folder "${folder}"`
			);
		out.push(parsed.data);
	}
	return out.sort((a, b) => a.key.localeCompare(b.key));
}

export const TEMPLATES: TemplateManifest[] = load();
export const DEFAULT_TEMPLATE = 'dental/template-1';

export function getTemplate(key: string | null | undefined): TemplateManifest | undefined {
	return TEMPLATES.find((t) => t.key === key);
}

/** Templates grouped by category, for pickers. */
export function templatesByCategory(): Array<{
	key: string;
	name: string;
	templates: TemplateManifest[];
}> {
	const map = new Map<string, { key: string; name: string; templates: TemplateManifest[] }>();
	for (const t of TEMPLATES) {
		const g = map.get(t.category.key) ?? {
			key: t.category.key,
			name: t.category.name,
			templates: []
		};
		g.templates.push(t);
		map.set(t.category.key, g);
	}
	return [...map.values()];
}
