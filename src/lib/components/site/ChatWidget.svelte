<script lang="ts">
	/**
	 * Chat module. Two providers:
	 *  - embed: third-party widget scripts, injected lazily after the page is idle
	 *  - endpoint: our own lightweight chat window talking to /api/chat (server proxy)
	 * The floating button sits above the mobile bottom bar.
	 */
	import { onMount, tick } from 'svelte';
	import Icon from '../Icon.svelte';
	import type { EmbedScript } from '#lib/chatbot/embed.js';

	interface Props {
		config: { provider: string; title: string; greeting: string; buttonLabel: string; hasEndpoint: boolean };
		scripts?: EmbedScript[];
	}
	let { config, scripts = [] }: Props = $props();

	// ── embed provider ──
	onMount(() => {
		if (config.provider !== 'embed' || !scripts.length) return;
		let done = false;
		const load = () => {
			if (done) return;
			done = true;
			for (const s of scripts) {
				const el = document.createElement('script');
				for (const [k, v] of Object.entries(s.attrs)) el.setAttribute(k, v);
				if (s.src) {
					el.src = s.src;
					el.async = true;
				} else if (s.inline) el.textContent = s.inline;
				document.body.appendChild(el);
			}
		};
		const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
		events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
		const t = setTimeout(load, 6000);
		return () => {
			clearTimeout(t);
			events.forEach((e) => window.removeEventListener(e, load));
		};
	});

	// ── endpoint provider ──
	type Msg = { role: 'user' | 'assistant'; text: string; links?: Array<{ label: string; href: string }> };
	let open = $state(false);
	let messages = $state<Msg[]>([]);
	let input = $state('');
	let sending = $state(false);
	let list: HTMLOListElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();
	const uid = $props.id();

	async function toggle() {
		open = !open;
		if (open) {
			if (!messages.length) messages = [{ role: 'assistant', text: config.greeting }];
			await tick();
			inputEl?.focus();
		}
	}

	async function send(e: SubmitEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || sending) return;
		messages = [...messages, { role: 'user', text }];
		input = '';
		sending = true;
		await scroll();
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message: text, history: messages.slice(-11, -1).map(({ role, text }) => ({ role, text })), page: location.pathname })
			});
			const data = await res.json();
			messages = [...messages, { role: 'assistant', text: String(data.reply ?? ''), links: data.links ?? [] }];
		} catch {
			messages = [...messages, { role: 'assistant', text: 'Sorry, something went wrong. Please try again or call us.' }];
		} finally {
			sending = false;
			await scroll();
		}
	}
	async function scroll() {
		await tick();
		list?.lastElementChild?.scrollIntoView({ block: 'end' });
	}
</script>

{#if config.provider === 'endpoint' && config.hasEndpoint}
	<div class="fixed right-4 z-50 flex flex-col items-end gap-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] lg:right-6 lg:bottom-6">
		{#if open}
			<div id="chat-{uid}" role="dialog" aria-label={config.title} class="card flex h-[min(32rem,70dvh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl">
				<header class="flex items-center justify-between bg-primary px-4 py-3 text-white">
					<p class="font-semibold">{config.title}</p>
					<button type="button" class="rounded p-1 hover:bg-white/15" aria-label="Close chat" onclick={() => (open = false)}><Icon name="x" size={18} /></button>
				</header>
				<ol bind:this={list} class="flex-1 space-y-3 overflow-y-auto bg-surface p-4" aria-live="polite">
					{#each messages as m, i (i)}
						<li class="flex {m.role === 'user' ? 'justify-end' : ''}">
							<div class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap {m.role === 'user' ? 'bg-primary text-white' : 'bg-white ring-1 ring-line'}">
								<span class="sr-only">{m.role === 'user' ? 'You:' : 'Assistant:'}</span>
								{m.text}
								{#if m.links?.length}
									<span class="mt-2 flex flex-wrap gap-1.5">
										{#each m.links as l (l.href)}<a href={l.href} class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800 hover:bg-primary-100">{l.label}</a>{/each}
									</span>
								{/if}
							</div>
						</li>
					{/each}
					{#if sending}<li class="text-sm text-muted">Typing…</li>{/if}
				</ol>
				<form class="flex gap-2 border-t border-line bg-white p-3" onsubmit={send}>
					<label class="sr-only" for="chat-in-{uid}">Your message</label>
					<input id="chat-in-{uid}" bind:this={inputEl} bind:value={input} maxlength="1000" class="input py-2" placeholder="Type your question…" autocomplete="off" />
					<button class="btn-primary px-3" disabled={sending || !input.trim()} aria-label="Send"><Icon name="arrow-right" size={18} /></button>
				</form>
			</div>
		{/if}
		<button type="button" class="btn-primary h-12 px-5 shadow-lg" aria-expanded={open} aria-controls="chat-{uid}" onclick={toggle}>
			<Icon name={open ? 'x' : 'message-circle'} size={20} />
			<span class={open ? 'sr-only' : ''}>{open ? 'Close chat' : config.buttonLabel}</span>
		</button>
	</div>
{/if}
