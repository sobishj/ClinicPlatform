<script lang="ts">
	import Icon from '../Icon.svelte';

	interface Props {
		service: { slug: string; name: string; icon: string | null; summary: string | null };
		headingLevel?: 'h2' | 'h3' | 'h4';
	}
	let { service, headingLevel = 'h3' }: Props = $props();
</script>

<a href="/services/{service.slug}" class="group card card-lift flex h-full flex-col p-6">
	<span class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-800 icon-pop group-hover:bg-primary group-hover:text-white">
		<Icon name={service.icon ?? 'sparkles'} size={24} />
	</span>
	<svelte:element this={headingLevel} class="font-heading text-lg">{service.name}</svelte:element>
	{#if service.summary}<p class="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>{/if}
	<span class="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary-700">Learn more <Icon name="arrow-right" size={16} class="transition-transform duration-300 group-hover:translate-x-1" /></span>
</a>
