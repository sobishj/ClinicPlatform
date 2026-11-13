<script lang="ts">
	import AdminForm from '#lib/admin/AdminForm.svelte';
	import PageHeader from '#lib/admin/PageHeader.svelte';
	import TextField from '#lib/admin/TextField.svelte';
	import Toggle from '#lib/admin/Toggle.svelte';
	import ImageField from '#lib/admin/ImageField.svelte';
	import RichTextEditor from '#lib/admin/RichTextEditor.svelte';
	import SeoFields from '#lib/admin/SeoFields.svelte';
	import { slugify } from '#lib/slug.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let pg = $state(structuredClone(data.page));
	let errors = $state<Record<string, string>>({});
	const isPost = $derived(pg.kind === 'post');
	const publicUrl = $derived(isPost ? `/blog/${pg.slug}` : `/${pg.slug}`);
</script>

<PageHeader title={data.isNew ? (isPost ? 'New article' : 'New page') : pg.title} back={{ href: '/admin/pages', label: 'Pages & blog' }}>
	{#snippet actions()}
		{#if !data.isNew}<a href={publicUrl} target="_blank" rel="noopener" class="btn-outline btn-sm">View on website</a>{/if}
	{/snippet}
</PageHeader>

<AdminForm payload={pg} bind:errors submitLabel={data.isNew ? 'Create' : 'Save changes'}>
	<div class="grid gap-6 lg:grid-cols-[1fr_300px]">
		<div class="card space-y-4 p-5">
			<TextField label="Title" bind:value={pg.title} required error={errors.title} />
			<TextField label="URL slug" bind:value={pg.slug} placeholder={slugify(pg.title)} error={errors.slug} hint={isPost ? `/blog/${pg.slug || slugify(pg.title)}` : `/${pg.slug || slugify(pg.title)}`} />
			<TextField label="Excerpt" type="textarea" rows={2} bind:value={pg.excerpt} maxlength={400} hint="Short summary for listings and search results." />
			<RichTextEditor label="Content" bind:value={pg.content} minHeight="20rem" />
		</div>
		<div class="space-y-4">
			<div class="card space-y-3 p-5">
				<Toggle label="Published" bind:checked={pg.published} />
				{#if isPost}
					<TextField label="Publish date" type="date" bind:value={pg.publishedAt} />
				{:else}
					<Toggle label="Link in footer" bind:checked={pg.showInFooter} />
				{/if}
			</div>
			<div class="card p-5"><ImageField label="Cover image" bind:value={pg.coverImage} maxWidth={1600} /></div>
		</div>
	</div>
	<div class="mt-6"><SeoFields bind:value={pg.seo} fallbackTitle={pg.title} /></div>
</AdminForm>
