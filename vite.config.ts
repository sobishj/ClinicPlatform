import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { fileURLToPath } from 'node:url';

/**
 * DEPLOY_TARGET picks the adapter and the platform module (`#target`) at build time.
 *  - node (default): adapter-node, better-sqlite3 file database, local-disk/S3 storage, SMTP
 *  - cloudflare:     adapter-cloudflare, D1, R2
 * Feature code never imports a driver directly; it goes through #lib/server/platform.
 */
const target = process.env.DEPLOY_TARGET === 'cloudflare' ? 'cloudflare' : 'node';
const targetModule = fileURLToPath(new URL(`./src/lib/server/target/${target}.ts`, import.meta.url));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter:
				target === 'cloudflare'
					? adapterCloudflare({ config: 'wrangler.toml' })
					: adapterNode({ out: 'build', precompress: true }),
			csp: {
				// Kit adds a per-request nonce to its own scripts. Dynamic sources (chatbot, analytics)
				// are appended in hooks.server.ts based on clinic settings.
				mode: 'nonce',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'https://challenges.cloudflare.com'],
					'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
					'font-src': ['self', 'data:', 'https://fonts.gstatic.com'],
					'img-src': ['self', 'data:', 'blob:', 'https:'],
					'frame-src': [
						'self',
						'https://www.google.com',
						'https://maps.google.com',
						'https://challenges.cloudflare.com'
					],
					'connect-src': ['self', 'https://challenges.cloudflare.com'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['self']
				}
			}
		})
	],
	resolve: {
		alias: [{ find: /^#target$/, replacement: targetModule }]
	},
	ssr: {
		external: target === 'node' ? ['better-sqlite3', 'nodemailer'] : []
	},
	define: {
		__DEPLOY_TARGET__: JSON.stringify(target)
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
