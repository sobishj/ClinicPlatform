import { error } from '@sveltejs/kit';
import type { ModuleKey, Settings } from '../settings/schema.js';

/** 404 when a module is switched off, so disabled sections have no reachable pages. */
export function requireModule(settings: Settings, key: ModuleKey) {
	if (!settings.modules[key]) error(404, { message: 'Page not found' });
}
