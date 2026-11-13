<script lang="ts">
	import Icon, { ICON_NAMES } from '#lib/components/Icon.svelte';
	import Modal from './Modal.svelte';

	interface Props {
		label?: string;
		value: string;
	}
	let { label = 'Icon', value = $bindable() }: Props = $props();
	let open = $state(false);
	let q = $state('');
	const SKIP = new Set(['grip', 'menu', 'x', 'log-out', 'chevron-left', 'chevron-right', 'chevron-down', 'arrow-left', 'arrow-right', 'trash', 'pencil', 'copy', 'refresh', 'external-link']);
	const names = $derived(ICON_NAMES.filter((n) => !SKIP.has(n) && n.includes(q.toLowerCase().trim())));
</script>

<div>
	<span class="label">{label}</span>
	<div class="flex items-center gap-2">
		<span class="flex size-11 items-center justify-center rounded-lg border border-line bg-primary-50 text-primary-800">
			{#if value}<Icon name={value} size={22} />{:else}<span class="text-xs text-muted">none</span>{/if}
		</span>
		<button type="button" class="btn-outline btn-sm" onclick={() => (open = true)}>{value ? 'Change' : 'Choose icon'}</button>
		{#if value}<button type="button" class="btn-ghost btn-sm" onclick={() => (value = '')}>Clear</button>{/if}
	</div>
</div>

<Modal bind:open title="Choose an icon" size="lg">
	<label class="sr-only" for="icon-q">Search icons</label>
	<input id="icon-q" class="input mb-4" placeholder="Search (e.g. tooth, eye, heart)" bind:value={q} />
	<ul class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
		{#each names as n (n)}
			<li>
				<button
					type="button"
					class="flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-xs hover:border-primary hover:bg-primary-50 {value === n
						? 'border-primary bg-primary-50'
						: 'border-line'}"
					onclick={() => {
						value = n;
						open = false;
					}}
				>
					<Icon name={n} size={24} />
					<span class="w-full truncate text-center text-muted">{n}</span>
				</button>
			</li>
		{/each}
	</ul>
</Modal>
