<script lang="ts">
	import type { FieldDef } from '#lib/content/collections.js';
	import type { ImageRef } from '#lib/types.js';
	import TextField from './TextField.svelte';
	import SelectField from './SelectField.svelte';
	import Toggle from './Toggle.svelte';
	import ImageField from './ImageField.svelte';
	import IconPicker from './IconPicker.svelte';
	import ListEditor from './ListEditor.svelte';
	import RichTextEditor from './RichTextEditor.svelte';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		field: FieldDef;
		record: Record<string, unknown>;
		error?: string;
	}
	let { field, record = $bindable(), error }: Props = $props();

	// Typed get/set pairs for Svelte 5 function bindings.
	const get = <T,>() => record[field.name] as T;
	const set = (v: unknown) => (record[field.name] = v);
	const links = $derived((record[field.name] as Array<{ label: string; href: string }>) ?? []);
</script>

{#if field.type === 'text' || field.type === 'url' || field.type === 'date' || field.type === 'textarea' || field.type === 'number'}
	<TextField
		label={field.label}
		type={field.type === 'url' ? 'text' : field.type}
		bind:value={get<string>, set}
		required={field.required}
		hint={field.hint}
		maxlength={field.max}
		{error}
	/>
{:else if field.type === 'richtext'}
	<RichTextEditor label={field.label} bind:value={() => get<string>() ?? '', set} hint={field.hint} {error} minHeight="7rem" />
{:else if field.type === 'select'}
	<SelectField label={field.label} bind:value={get<string>, set} options={field.options ?? []} {error} />
{:else if field.type === 'boolean'}
	<Toggle label={field.label} bind:checked={() => !!get<boolean>(), set} />
{:else if field.type === 'rating'}
	<fieldset>
		<legend class="label">{field.label}</legend>
		<div class="flex gap-1">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<button
					type="button"
					class="rounded p-1 {Number(record[field.name] ?? 5) >= n ? 'text-accent' : 'text-gray-300'}"
					aria-label="{n} star{n > 1 ? 's' : ''}"
					aria-pressed={Number(record[field.name]) === n}
					onclick={() => set(n)}><Icon name="star" size={24} /></button
				>
			{/each}
		</div>
	</fieldset>
{:else if field.type === 'image'}
	<ImageField label={field.label} bind:value={get<ImageRef | null>, set} required={field.required} {error} maxWidth={1600} />
{:else if field.type === 'icon'}
	<IconPicker label={field.label} bind:value={() => get<string>() ?? '', set} />
{:else if field.type === 'list'}
	<ListEditor label={field.label} bind:items={() => get<string[]>() ?? [], set} hint={field.hint} {error} />
{:else if field.type === 'links'}
	<fieldset>
		<legend class="label">{field.label}</legend>
		{#if field.hint}<p class="hint mt-0 mb-2">{field.hint}</p>{/if}
		<ul class="space-y-2">
			{#each links as link, i (i)}
				<li class="flex flex-wrap gap-2">
					<input class="input min-w-32 flex-1" placeholder="Label" aria-label="Link {i + 1} label" bind:value={link.label} />
					<input class="input min-w-40 flex-1" placeholder="/book" aria-label="Link {i + 1} address" bind:value={link.href} />
					<button type="button" class="btn-ghost btn-sm text-red-700" aria-label="Remove link {i + 1}" onclick={() => set(links.filter((_, j) => j !== i))}>
						<Icon name="x" size={16} />
					</button>
				</li>
			{/each}
		</ul>
		{#if links.length < 3}
			<button type="button" class="btn-outline btn-sm mt-2" onclick={() => set([...links, { label: '', href: '' }])}><Icon name="plus" size={16} /> Add link</button>
		{/if}
		{#if error}<p class="field-error">{error}</p>{/if}
	</fieldset>
{/if}
