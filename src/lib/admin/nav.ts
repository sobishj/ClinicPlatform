import type { Permission } from '../permissions.js';

export interface NavItem {
	href: string;
	label: string;
	icon: string;
	permission: Permission;
	/** Optional module that must be enabled. */
	module?: string;
}
export interface NavGroup {
	label: string;
	items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
	{
		label: '',
		items: [
			{ href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'content:read' },
			{ href: '/admin/appointments', label: 'Appointments', icon: 'calendar-check', permission: 'appointments:read' },
			{ href: '/admin/messages', label: 'Messages', icon: 'message-circle', permission: 'appointments:read' }
		]
	},
	{
		label: 'Website',
		items: [
			{ href: '/admin/slides', label: 'Hero slides', icon: 'image', permission: 'content:write' },
			{ href: '/admin/homepage', label: 'Homepage', icon: 'house', permission: 'content:write' },
			{ href: '/admin/locations', label: 'Locations', icon: 'map-pin', permission: 'content:read' },
			{ href: '/admin/doctors', label: 'Doctors', icon: 'stethoscope', permission: 'content:read' },
			{ href: '/admin/services', label: 'Services', icon: 'layers', permission: 'content:read' },
			{ href: '/admin/certifications', label: 'Certifications', icon: 'award', permission: 'content:read' },
			{ href: '/admin/content', label: 'Content blocks', icon: 'list', permission: 'content:write' },
			{ href: '/admin/pages', label: 'Pages & blog', icon: 'file-text', permission: 'content:write' },
			{ href: '/admin/media', label: 'Media library', icon: 'image', permission: 'media:write' }
		]
	},
	{
		label: 'Settings',
		items: [
			{ href: '/admin/settings', label: 'Colours & branding', icon: 'sparkles', permission: 'settings:manage' },
			{ href: '/admin/settings/site', label: 'Type, labels & modules', icon: 'settings', permission: 'settings:manage' },
			{ href: '/admin/settings/booking', label: 'Booking', icon: 'calendar', permission: 'settings:manage' },
			{ href: '/admin/settings/notifications', label: 'Notifications & email', icon: 'mail', permission: 'settings:manage' },
			{ href: '/admin/settings/seo', label: 'SEO, analytics & spam', icon: 'globe', permission: 'settings:manage' },
			{ href: '/admin/settings/chatbot', label: 'Chatbot', icon: 'bot', permission: 'settings:manage' },
			{ href: '/admin/integrations', label: 'Integrations & API', icon: 'webhook', permission: 'integrations:manage' },
			{ href: '/admin/users', label: 'Users', icon: 'users', permission: 'users:manage' },
			{ href: '/admin/audit', label: 'Audit log', icon: 'clipboard-list', permission: 'audit:read' }
		]
	}
];
