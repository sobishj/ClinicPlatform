/**
 * Plain-language explanations for the console, shown by the ⓘ buttons next to page titles,
 * section headings and settings. Same format as the client admin's help (admin/help.ts).
 */
import type { PageHelp } from '../admin/help.js';

export const CONSOLE_HELP = {
	// ── Pages ──────────────────────────────────────────────────────────────────────
	clients: {
		name: 'Clients',
		purpose:
			'Every clinic you host. Each one has its own website, its own database, its own admin logins and its own bookings, so no client can ever see another client’s data.',
		points: [
			'Click a client’s name to change its web addresses, details or logins, or to open its site admin.',
			'“Live” sites are open to visitors. “Suspended” sites show a “temporarily unavailable” page.',
			'Use “Add client” to set up a new clinic from a template.'
		]
	},
	slots: {
		name: 'Database slots',
		purpose:
			'On Cloudflare each client needs a database of its own, and those databases must be listed in wrangler.toml before deploying. Each listed database is a “slot”.',
		points: [
			'When every slot is in use, create another D1 database, add it to wrangler.toml as TENANT_4, TENANT_5 and so on, and redeploy.',
			'The free plan allows 10 databases per account: one for the platform and up to 9 clients.'
		]
	},
	newClient: {
		name: 'Add client',
		purpose:
			'Sets up a new clinic: creates its own database, fills it with the chosen template’s sample content, connects its web addresses and, if you like, creates its admin login.',
		points: [
			'Everything entered here can be changed later on the client’s page.',
			'The sample doctors, services and pages are placeholders for the clinic to replace in their admin.',
			'If anything goes wrong, nothing is saved and you can simply try again.'
		]
	},
	client: {
		name: 'Client',
		purpose: 'Everything about one client: its web addresses, details, logins and history.',
		points: [
			'“Open site admin” signs you into this clinic’s admin as Super admin. No password needed.',
			'“View website” opens the site at its main address.'
		]
	},
	setup: {
		name: 'Console setup',
		purpose:
			'Creates the first console account. It can add and manage every client, so this page only works once: after that it closes and you sign in normally.'
	},

	// ── Add client ─────────────────────────────────────────────────────────────────
	clinicNameNew: {
		name: 'Clinic name',
		purpose:
			'The clinic’s name. It’s shown in the console and is also put on the new website as the clinic’s name.',
		points: [
			'The clinic can change the name on their website later in their admin, under Colours & branding.'
		]
	},
	handle: {
		name: 'Handle',
		purpose:
			'A short internal name for the client, for example “orchid”. Used in the console, in command-line tools and to confirm deleting the client. Visitors never see it.',
		points: [
			'Filled in from the clinic name automatically. Only letters, numbers and dashes.',
			'It can’t be changed later.'
		]
	},
	template: {
		name: 'Template',
		purpose:
			'The design the client’s website uses: its layout, pages and section styles. Templates are grouped by type of clinic.',
		points: [
			'A new client starts with the template’s sample content, which the clinic then replaces with their own.',
			'Changing the template later keeps all of the client’s content.'
		]
	},
	clientUrls: {
		name: 'Client URLs',
		purpose:
			'The web addresses (domains) that should show this client’s website. The platform uses them to recognise which clinic a visitor is asking for.',
		points: [
			'One per line. The first becomes the main address; the others redirect to it.',
			'Add both versions of a domain, for example www.dent.in and dent.in.',
			'Adding an address doesn’t move the domain by itself: the domain’s DNS must also point to this platform.',
			'For testing on this computer, use names ending in .localhost.'
		]
	},
	adminLogin: {
		name: 'Client admin login',
		purpose:
			'The login the clinic uses to edit their own website and see their bookings, at their web address followed by /admin.',
		points: [
			'Optional. You can add logins later on the client’s page, and you can always go in yourself with “Open site admin”.',
			'This login is a Clinic admin: they edit content and bookings, but not technical settings.',
			'Passwords need at least 10 characters. Share it securely; the clinic can change it under Account.'
		]
	},
	slot: {
		name: 'Database slot',
		purpose:
			'Which Cloudflare database this client’s data is stored in. Every client uses a slot of its own.',
		points: [
			'Any free slot will do; they are all the same.',
			'Tick “Wipe the slot” only if it still holds a deleted client’s data. That old data is erased.'
		]
	},
	demoAppointments: {
		name: 'Demo appointment requests',
		purpose:
			'Adds a few made-up appointment requests, so you can show the clinic how the bookings screen works.',
		points: ['Delete them in the client’s admin before the site goes live.']
	},

	// ── Client page ────────────────────────────────────────────────────────────────
	webAddresses: {
		name: 'Web addresses',
		purpose:
			'The domains that show this client’s website. When a visitor arrives, the platform looks up the address they typed in this list to know which clinic’s site to show.',
		points: [
			'Add both versions of a domain, for example www.dent.in and dent.in.',
			'Adding an address here doesn’t move the domain: its DNS (at the registrar) must also point to this platform.',
			'Add the address here before changing the DNS, so the first visitors don’t see “not found”.',
			'Removing an address stops it showing this site.'
		]
	},
	mainAddress: {
		name: 'Main address',
		purpose:
			'The official address of the site. Visitors who arrive on any of the client’s other addresses are sent to it automatically, so Google, shared links and logins all use one address.',
		points: [
			'Usually the www version, for example www.dent.in.',
			'While testing on this computer, keep a .localhost address as the main one. Otherwise visitors are sent to a real domain that doesn’t point here yet.'
		]
	},
	details: {
		name: 'Details',
		purpose:
			'The client’s basic information on the platform: its name in the console, which template its website uses, whether the site is live, and your private notes.',
		points: ['Press Save after changing anything here.']
	},
	clinicName: {
		name: 'Clinic name',
		purpose: 'The client’s name in the console.',
		points: [
			'The name visitors see on the website is changed in the client’s admin, under Colours & branding.'
		]
	},
	templateEdit: {
		name: 'Template',
		purpose: 'The design this client’s website uses.',
		points: ['Changing it keeps all of the client’s content: doctors, services, pages, bookings and images.']
	},
	status: {
		name: 'Status',
		purpose: 'Whether the website is open to visitors.',
		points: [
			'Live: the website works normally.',
			'Suspended: visitors see a “temporarily unavailable” page, for example while payment is overdue. Nothing is deleted, and switching back to Live restores the site straight away.'
		]
	},
	notes: {
		name: 'Notes',
		purpose:
			'Private notes about this client for you and other console users, such as contact person, plan or renewal date. Never shown on the website.'
	},
	logins: {
		name: 'Client logins',
		purpose:
			'The people who can sign in to this clinic’s admin. Each client has its own list; console logins don’t work there.',
		points: [
			'Entering an email that already exists resets that login’s password and role.',
			'Clinic admin: edits the website and handles bookings. Staff: bookings only.',
			'To get in yourself, use “Open site admin” at the top instead of a password.'
		]
	},
	activity: {
		name: 'Console activity',
		purpose:
			'A record of changes made to this client from the console: who did what, and when. Changes made inside the client’s own admin are in its Audit log.'
	},
	deleteClient: {
		name: 'Delete client',
		purpose:
			'Takes the client off the platform: its website stops working and its addresses and logins are removed.',
		points: [
			'On your own server, the client’s database and files are moved to data/tenants/_deleted/, not erased.',
			'On Cloudflare, the data stays in its database slot until that slot is wiped for a new client.',
			'To take a site offline temporarily, set its Status to Suspended instead.'
		]
	},

	// ── Setup ──────────────────────────────────────────────────────────────────────
	setupToken: {
		name: 'Setup token',
		purpose:
			'A one-time password that proves you are the owner. Because the console is on a public address, it stops anyone else from creating the first account before you do.',
		points: [
			'It’s the value of the SETUP_TOKEN setting on the server (on Cloudflare, a Worker secret).',
			'Only needed once. After your account exists, you sign in with your email and password.'
		]
	}
} satisfies Record<string, PageHelp>;

export type ConsoleHelpKey = keyof typeof CONSOLE_HELP;
