import type { RequestEvent } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { runBatch, type DB } from './db/index.js';
import { requirePermission } from './auth.js';
import { parsePayload, failMessage } from './forms.js';
import { contentChanged } from './audit.js';
import { slugify } from '../slug.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type TableWith<C extends string> = SQLiteTable & Record<C, any>;

/** Persist a new order: payload { ids: string[] } → sort_order = index. */
export async function reorderAction(event: RequestEvent, table: TableWith<'id' | 'sortOrder'>, entity: string) {
	requirePermission(event, 'content:write');
	const parsed = await parsePayload(event.request, z.object({ ids: z.array(z.string()).max(500) }));
	if (!parsed.ok) return parsed.failure;
	const db = event.locals.db;
	await runBatch(
		db,
		parsed.data.ids.map((id, i) =>
			db
				.update(table)
				.set({ sortOrder: i } as any)
				.where(eq(table.id, id))
		)
	);
	await contentChanged(event, 'reorder', entity, null, `Reordered ${parsed.data.ids.length} ${entity}s`);
	return { ok: true };
}

/** Toggle a boolean column from a plain form (id, value). */
export async function toggleAction(event: RequestEvent, table: TableWith<'id'>, entity: string, column = 'active') {
	requirePermission(event, 'content:write');
	const form = await event.request.formData();
	const id = String(form.get('id') ?? '');
	const value = form.get('value') === 'true';
	if (!id) return failMessage('Missing id');
	await event.locals.db
		.update(table)
		.set({ [column]: value } as any)
		.where(eq(table.id, id));
	await contentChanged(event, 'update', entity, id, `${column} → ${value}`);
	return { ok: true };
}

export async function deleteAction(event: RequestEvent, table: TableWith<'id'>, entity: string, describe?: (row: any) => string) {
	requirePermission(event, 'content:write');
	const form = await event.request.formData();
	const id = String(form.get('id') ?? '');
	const db = event.locals.db;
	const row = await db.select().from(table).where(eq(table.id, id)).get();
	if (!row) return failMessage('Not found', 404);
	await db.delete(table).where(eq(table.id, id));
	await contentChanged(event, 'delete', entity, id, describe?.(row) ?? '');
	return { ok: true, deleted: id };
}

/** Make a slug unique within a table (appends -2, -3…). */
export async function uniqueSlug(
	db: DB,
	table: TableWith<'id' | 'slug'>,
	input: string,
	excludeId?: string,
	extra?: ReturnType<typeof eq>
): Promise<string> {
	const base = slugify(input) || 'item';
	for (let i = 1; i < 100; i++) {
		const candidate = i === 1 ? base : `${base}-${i}`;
		const conds = [eq(table.slug, candidate)];
		if (excludeId) conds.push(ne(table.id, excludeId));
		if (extra) conds.push(extra);
		const clash = await db
			.select({ id: table.id })
			.from(table)
			.where(and(...conds))
			.get();
		if (!clash) return candidate;
	}
	return `${base}-${Date.now()}`;
}

export async function nextSortOrder(db: DB, table: TableWith<'sortOrder'>, where?: ReturnType<typeof eq>) {
	const row = await db
		.select({ max: sql<number>`COALESCE(MAX(${table.sortOrder}), -1)` })
		.from(table)
		.where(where)
		.get();
	return (row?.max ?? -1) + 1;
}

/** Shared Zod pieces for admin forms. */
export const imageRefSchema = z.object({
	url: z.string().min(1),
	alt: z.string().trim().min(1, 'Alt text is required for every image').max(300),
	width: z.number().nullish(),
	height: z.number().nullish(),
	mediaId: z.string().nullish()
});
export const optionalImage = imageRefSchema.nullable().default(null);
export const slugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(80)
	.regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, 'Use lowercase letters, numbers and hyphens only')
	.default('');
export const seoSchema = z
	.object({
		title: z.string().trim().max(120).optional(),
		description: z.string().trim().max(320).optional(),
		ogImage: z.string().trim().max(500).optional()
	})
	.nullable()
	.default(null);
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
export const timeRangeSchema = z
	.object({ open: z.string().regex(timeRe, 'Use HH:MM'), close: z.string().regex(timeRe, 'Use HH:MM') })
	.refine((r) => r.open < r.close, 'Closing time must be after opening time');
export const weeklyHoursSchema = z
	.object({
		mon: z.array(timeRangeSchema).max(4).optional(),
		tue: z.array(timeRangeSchema).max(4).optional(),
		wed: z.array(timeRangeSchema).max(4).optional(),
		thu: z.array(timeRangeSchema).max(4).optional(),
		fri: z.array(timeRangeSchema).max(4).optional(),
		sat: z.array(timeRangeSchema).max(4).optional(),
		sun: z.array(timeRangeSchema).max(4).optional()
	})
	.default({});
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
export const dateRangeSchema = z
	.object({
		startDate: z.string().regex(dateRe, 'Choose a date'),
		endDate: z.string().regex(dateRe, 'Choose a date'),
		reason: z.string().trim().max(200).optional().default('')
	})
	.refine((r) => r.startDate <= r.endDate, 'End date must be on or after the start date');
