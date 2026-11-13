<script lang="ts">
	/**
	 * Social network logos in their official brand colours (as small badges), so they read
	 * correctly on both light and dark backgrounds.
	 */
	interface Props {
		name: 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'google' | string;
		size?: number;
	}
	let { name, size = 24 }: Props = $props();
	const uid = $props.id();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="shrink-0">
	{#if name === 'facebook'}
		<circle cx="12" cy="12" r="12" fill="#1877F2" />
		<path fill="#fff" d="M16.5 15.47 17.03 12H13.7V9.75c0-.95.47-1.88 1.95-1.88h1.51V4.92s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H6.9v3.47h3.05V24h3.75v-8.53z" />
	{:else if name === 'instagram'}
		<defs>
			<radialGradient id="ig-{uid}" cx="30%" cy="107%" r="150%">
				<stop offset="0" stop-color="#fdf497" />
				<stop offset="0.05" stop-color="#fdf497" />
				<stop offset="0.45" stop-color="#fd5949" />
				<stop offset="0.6" stop-color="#d6249f" />
				<stop offset="0.9" stop-color="#285AEB" />
			</radialGradient>
		</defs>
		<rect width="24" height="24" rx="6" fill="url(#ig-{uid})" />
		<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" stroke-width="1.8" />
		<circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" stroke-width="1.8" />
		<circle cx="16.4" cy="7.6" r="1.05" fill="#fff" />
	{:else if name === 'youtube'}
		<rect y="3.5" width="24" height="17" rx="5" fill="#FF0000" />
		<path fill="#fff" d="M9.75 8.3v7.4L16 12z" />
	{:else if name === 'linkedin'}
		<rect width="24" height="24" rx="4" fill="#0A66C2" />
		<path fill="#fff" d="M7.1 9.6h2.6V18H7.1zm1.3-4.1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M11.3 9.6h2.5v1.15h.04c.35-.66 1.2-1.36 2.47-1.36 2.64 0 3.13 1.74 3.13 4V18h-2.6v-4.1c0-.98-.02-2.24-1.37-2.24-1.37 0-1.58 1.07-1.58 2.17V18h-2.6z" />
	{:else if name === 'x'}
		<circle cx="12" cy="12" r="12" fill="#000" />
		<path fill="#fff" d="M13.2 11.05 17.7 6h-1.07l-3.9 4.38L9.62 6H6l4.72 6.7L6 18h1.07l4.12-4.63L14.48 18H18.1zm-1.46 1.64-.48-.67L7.45 6.8h1.64l3.07 4.3.48.67 3.99 5.6h-1.64z" />
	{:else if name === 'google'}
		<circle cx="12" cy="12" r="12" fill="#fff" />
		<path fill="#4285F4" d="M19.6 12.2c0-.57-.05-1.12-.15-1.64H12v3.1h4.26a3.64 3.64 0 0 1-1.58 2.39v1.98h2.56c1.5-1.38 2.36-3.41 2.36-5.83" />
		<path fill="#34A853" d="M12 20c2.14 0 3.94-.71 5.25-1.92l-2.56-1.98c-.71.48-1.62.76-2.69.76-2.07 0-3.82-1.4-4.45-3.27H4.9v2.05A7.94 7.94 0 0 0 12 20" />
		<path fill="#FBBC05" d="M7.55 13.6a4.77 4.77 0 0 1 0-3.2V8.35H4.9a7.98 7.98 0 0 0 0 7.3z" />
		<path fill="#EA4335" d="M12 7.18c1.17 0 2.22.4 3.04 1.19l2.28-2.27A7.64 7.64 0 0 0 12 4a7.94 7.94 0 0 0-7.1 4.35l2.65 2.05C8.18 8.57 9.93 7.18 12 7.18" />
	{/if}
</svg>
