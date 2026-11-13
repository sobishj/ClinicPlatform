<script lang="ts">
	import BrandIcon from './BrandIcon.svelte';

	interface Props {
		social: Record<string, string | undefined>;
		size?: number;
		class?: string;
	}
	let { social, size = 20, class: klass = '' }: Props = $props();
	const names: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X', google: 'Google' };
	const entries = $derived(Object.entries(social).filter(([k, v]) => v && names[k] && /^https:\/\//.test(v)));
</script>

{#if entries.length}
	<ul class="flex items-center gap-1.5 {klass}">
		{#each entries as [key, url] (key)}
			<li>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110"
					aria-label="{names[key]} (opens in a new tab)"
				>
					<BrandIcon name={key} {size} />
				</a>
			</li>
		{/each}
	</ul>
{/if}
