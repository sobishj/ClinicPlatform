import { defineConfig } from 'drizzle-kit';

/** Platform database (clients, domains, console users). Tenant schema: drizzle.config.ts */
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/platform-db/schema.ts',
	out: './drizzle-platform'
});
