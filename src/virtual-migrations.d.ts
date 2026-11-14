declare module 'virtual:migrations' {
	/** File name → SQL, from drizzle/ (client databases). */
	export const tenant: Record<string, string>;
	/** File name → SQL, from drizzle-platform/ (platform database). */
	export const platform: Record<string, string>;
}
