<script lang="ts">
	import Icon from '../Icon.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		href: string;
		active?: boolean;
		children: Snippet;
		wide?: boolean;
	}
	let { label, href, active = false, children, wide = false }: Props = $props();
	let open = $state(false);
	let root: HTMLElement | undefined = $state();
	const uid = $props.id();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			root?.querySelector<HTMLButtonElement>('button')?.focus();
		}
	}
	function onFocusOut(e: FocusEvent) {
		if (root && !root.contains(e.relatedTarget as Node)) open = false;
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={root}
	class="relative"
	onmouseenter={() => (open = true)}
	onmouseleave={() => (open = false)}
	onfocusout={onFocusOut}
>
	<div class="flex items-center">
		<a {href} class="nav-link rounded-full py-2 pr-1 pl-3 text-[15px] font-medium hover:text-primary-700 {active ? 'text-primary-700' : ''}" aria-current={active ? 'page' : undefined}>{label}</a>
		<button
			type="button"
			class="rounded-full p-1.5 transition-colors hover:bg-primary-50"
			aria-expanded={open}
			aria-controls="dd-{uid}"
			aria-label="Show {label} menu"
			onclick={() => (open = !open)}
		>
			<Icon name="chevron-down" size={16} class="transition-transform duration-300 {open ? 'rotate-180' : ''}" />
		</button>
	</div>
	<div
		id="dd-{uid}"
		class="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 {open ? '' : 'hidden'}"
	>
		<div class="card max-h-[70vh] overflow-y-auto p-3 shadow-xl {wide ? 'w-[min(90vw,44rem)]' : 'w-72'}">
			{@render children()}
		</div>
	</div>
</div>
