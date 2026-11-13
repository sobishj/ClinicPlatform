<script lang="ts">
	import { page as pageState } from '$app/state';
	interface Props {
		page: number;
		hasMore: boolean;
	}
	let { page, hasMore }: Props = $props();
	function href(p: number) {
		const u = new URL(pageState.url);
		u.searchParams.set('page', String(p));
		return u.pathname + u.search;
	}
</script>

{#if page > 1 || hasMore}
	<nav class="mt-4 flex items-center justify-between" aria-label="Pagination">
		{#if page > 1}<a class="btn-outline btn-sm" href={href(page - 1)}>← Previous</a>{:else}<span></span>{/if}
		<span class="text-sm text-muted">Page {page}</span>
		{#if hasMore}<a class="btn-outline btn-sm" href={href(page + 1)}>Next →</a>{:else}<span></span>{/if}
	</nav>
{/if}
