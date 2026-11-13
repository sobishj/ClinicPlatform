<script lang="ts">
	import Icon from '../Icon.svelte';

	interface Props {
		social: Record<string, string | undefined>;
		size?: number;
		class?: string;
	}
	let { social, size = 18, class: klass = '' }: Props = $props();
	const names: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X', google: 'Google' };
	const entries = $derived(Object.entries(social).filter(([k, v]) => v && names[k] && /^https:\/\//.test(v)));
</script>

{#if entries.length}
	<ul class="flex items-center gap-1 {klass}">
		{#each entries as [key, url] (key)}
			<li>
				<a href={url} target="_blank" rel="noopener noreferrer" class="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="{names[key]} (opens in a new tab)">
					<Icon name={key} {size} />
				</a>
			</li>
		{/each}
	</ul>
{/if}
