/** Minimal ambient types for the Workers runtime module (used only by target/cloudflare.ts). */
declare module 'cloudflare:workers' {
	export const env: Record<string, unknown>;
	export function waitUntil(promise: Promise<unknown>): void;
}
