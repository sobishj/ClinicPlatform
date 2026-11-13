<script lang="ts">
	import Modal from './Modal.svelte';
	import type { CropRect } from '#lib/client/image.js';

	interface Props {
		open: boolean;
		file: File | null;
		/** width / height, e.g. 1 for square, 0.8 for 4:5 portrait */
		aspect: number;
		title?: string;
		oncrop: (rect: CropRect) => void;
	}
	let { open = $bindable(), file, aspect, title = 'Crop image', oncrop }: Props = $props();

	let src = $state('');
	let natW = $state(0);
	let natH = $state(0);
	let zoom = $state(1);
	let x = $state(0);
	let y = $state(0);
	let frame: HTMLDivElement | undefined = $state();
	let frameW = $state(400);
	const frameH = $derived(frameW / aspect);

	$effect(() => {
		if (!file) return;
		const url = URL.createObjectURL(file);
		src = url;
		const img = new Image();
		img.onload = () => {
			natW = img.naturalWidth;
			natH = img.naturalHeight;
			zoom = 1;
			center();
		};
		img.src = url;
		return () => URL.revokeObjectURL(url);
	});

	const baseScale = $derived(natW && natH ? Math.max(frameW / natW, frameH / natH) : 1);
	const scale = $derived(baseScale * zoom);
	const dispW = $derived(natW * scale);
	const dispH = $derived(natH * scale);

	function clamp() {
		x = Math.min(0, Math.max(frameW - dispW, x));
		y = Math.min(0, Math.max(frameH - dispH, y));
	}
	function center() {
		x = (frameW - natW * baseScale * zoom) / 2;
		y = (frameH - natH * baseScale * zoom) / 2;
	}

	let dragging = $state<{ px: number; py: number; x: number; y: number } | null>(null);
	function down(e: PointerEvent) {
		dragging = { px: e.clientX, py: e.clientY, x, y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging) return;
		x = dragging.x + (e.clientX - dragging.px);
		y = dragging.y + (e.clientY - dragging.py);
		clamp();
	}
	function key(e: KeyboardEvent) {
		const step = e.shiftKey ? 30 : 8;
		if (e.key === 'ArrowLeft') x += step;
		else if (e.key === 'ArrowRight') x -= step;
		else if (e.key === 'ArrowUp') y += step;
		else if (e.key === 'ArrowDown') y -= step;
		else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.1);
		else if (e.key === '-') setZoom(zoom - 0.1);
		else return;
		e.preventDefault();
		clamp();
	}
	function setZoom(z: number) {
		const cx = frameW / 2,
			cy = frameH / 2;
		const old = scale;
		zoom = Math.min(4, Math.max(1, z));
		const ns = baseScale * zoom;
		x = cx - ((cx - x) / old) * ns;
		y = cy - ((cy - y) / old) * ns;
		clamp();
	}

	function apply() {
		oncrop({ sx: -x / scale, sy: -y / scale, sw: frameW / scale, sh: frameH / scale });
		open = false;
	}

	$effect(() => {
		if (!frame) return;
		const ro = new ResizeObserver(() => {
			frameW = Math.min(frame!.parentElement!.clientWidth, 520);
			clamp();
		});
		ro.observe(frame.parentElement!);
		return () => ro.disconnect();
	});
</script>

<Modal bind:open {title} size="md">
	<p class="mb-3 text-sm text-muted">Drag to position. Use the slider (or + / − keys) to zoom.</p>
	<div class="flex justify-center">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={frame}
			role="application"
			aria-label="Crop area. Use arrow keys to move the image and plus or minus to zoom."
			tabindex="0"
			class="relative touch-none overflow-hidden rounded-lg bg-gray-100 select-none"
			style="width:{frameW}px;height:{frameH}px;cursor:{dragging ? 'grabbing' : 'grab'}"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={() => (dragging = null)}
			onkeydown={key}
		>
			{#if src}
				<img
					{src}
					alt=""
					draggable="false"
					class="pointer-events-none absolute max-w-none"
					style="left:{x}px;top:{y}px;width:{dispW}px;height:{dispH}px"
				/>
			{/if}
			<div class="pointer-events-none absolute inset-0 ring-2 ring-white/80 ring-inset"></div>
		</div>
	</div>
	<label class="mt-4 flex items-center gap-3 text-sm">
		<span class="w-12 text-muted">Zoom</span>
		<input
			type="range"
			min="1"
			max="4"
			step="0.01"
			value={zoom}
			oninput={(e) => setZoom(Number(e.currentTarget.value))}
			class="w-full accent-[var(--brand-primary)]"
		/>
	</label>
	{#snippet footer()}
		<button type="button" class="btn-ghost" onclick={() => (open = false)}>Cancel</button>
		<button type="button" class="btn-primary" onclick={apply}>Use this crop</button>
	{/snippet}
</Modal>
