<script lang="ts">
	/**
	 * Lightweight rich-text editor (contenteditable + a small toolbar). Output is
	 * sanitised again on the server with an allowlist before it is stored.
	 */
	interface Props {
		label: string;
		value: string;
		hint?: string;
		error?: string;
		minHeight?: string;
	}
	let { label, value = $bindable(), hint, error, minHeight = '10rem' }: Props = $props();
	const uid = $props.id();
	let el: HTMLDivElement | undefined = $state();
	let lastSet = '';

	$effect(() => {
		// Sync external value → DOM only when it changed from outside (avoids caret jumps).
		if (el && value !== lastSet && value !== el.innerHTML) {
			el.innerHTML = value ?? '';
			lastSet = value;
		}
	});

	function sync() {
		if (!el) return;
		lastSet = el.innerHTML;
		value = lastSet;
	}

	function exec(cmd: string, arg?: string) {
		el?.focus();
		document.execCommand(cmd, false, arg);
		sync();
	}

	function link() {
		const url = prompt('Link address (https://…, /page, tel:, mailto:)');
		if (!url) return;
		if (!/^(https?:\/\/|\/|#|tel:|mailto:)/i.test(url)) {
			alert('Links must start with https://, /, tel: or mailto:');
			return;
		}
		exec('createLink', url);
	}

	function paste(e: ClipboardEvent) {
		// Paste as plain text (keeps line breaks) so formatting from Word/websites does not leak in.
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') ?? '';
		const html = text
			.split(/\n{2,}/)
			.map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!).replace(/\n/g, '<br>')}</p>`)
			.join('');
		document.execCommand('insertHTML', false, html);
		sync();
	}

	const tools: Array<{ label: string; text: string; run: () => void; cls?: string }> = [
		{ label: 'Bold', text: 'B', run: () => exec('bold'), cls: 'font-bold' },
		{ label: 'Italic', text: 'I', run: () => exec('italic'), cls: 'italic' },
		{ label: 'Heading', text: 'H2', run: () => exec('formatBlock', 'h2') },
		{ label: 'Subheading', text: 'H3', run: () => exec('formatBlock', 'h3') },
		{ label: 'Paragraph', text: '¶', run: () => exec('formatBlock', 'p') },
		{ label: 'Bulleted list', text: '•', run: () => exec('insertUnorderedList') },
		{ label: 'Numbered list', text: '1.', run: () => exec('insertOrderedList') },
		{ label: 'Quote', text: '“', run: () => exec('formatBlock', 'blockquote') },
		{ label: 'Link', text: '🔗', run: link },
		{ label: 'Remove link', text: '⛓̸', run: () => exec('unlink') },
		{ label: 'Clear formatting', text: 'Tx', run: () => exec('removeFormat') }
	];
</script>

<div>
	<span id="rt-{uid}" class="label">{label}</span>
	<div class="overflow-hidden rounded-lg border border-line bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary {error ? 'border-red-400' : ''}">
		<div class="flex flex-wrap gap-0.5 border-b border-line bg-gray-50 p-1" role="toolbar" aria-label="Formatting">
			{#each tools as t (t.label)}
				<button
					type="button"
					class="min-w-8 rounded px-2 py-1 text-sm hover:bg-white {t.cls ?? ''}"
					title={t.label}
					aria-label={t.label}
					onmousedown={(e) => e.preventDefault()}
					onclick={t.run}>{t.text}</button
				>
			{/each}
		</div>
		<div
			bind:this={el}
			contenteditable="true"
			role="textbox"
			tabindex="0"
			aria-multiline="true"
			aria-labelledby="rt-{uid}"
			aria-describedby={hint ? `rt-${uid}-h` : undefined}
			aria-invalid={!!error}
			class="prose-clinic prose-sm max-w-none px-3 py-2 outline-none"
			style="min-height:{minHeight}"
			oninput={sync}
			onblur={sync}
			onpaste={paste}
		></div>
	</div>
	{#if hint}<p id="rt-{uid}-h" class="hint">{hint}</p>{/if}
	{#if error}<p class="field-error">{error}</p>{/if}
</div>
