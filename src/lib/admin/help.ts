/**
 * Plain-language explanations for every admin page, shown by the ⓘ button in the page header.
 * Keyed by SvelteKit route id. Wording uses the clinic's own labels (e.g. "Dentists").
 */
import type { Settings } from '../settings/schema.js';

export interface PageHelp {
	/** Page name for the explanation title, when the page heading is not a name (e.g. the greeting). */
	name?: string;
	/** What this page is for, in one or two sentences. */
	purpose: string;
	/** What you can do here / useful tips. */
	points?: string[];
}

type Labels = Settings['labels'];

export function pageHelp(routeId: string | null, l: Labels): PageHelp | null {
	const doctors = l.doctors.toLowerCase();
	const doctor = l.doctor.toLowerCase();
	const services = l.services.toLowerCase();
	const service = l.service.toLowerCase();
	const locations = l.locations.toLowerCase();
	const location = l.location.toLowerCase();

	const HELP: Record<string, PageHelp> = {
		'/admin': {
			name: 'Dashboard',
			purpose: 'Your starting point. It shows appointment requests that still need a call back, and shortcuts to the parts of the website you edit most.',
			points: [
				'Tap Call or WhatsApp to contact a patient straight away.',
				'Open a request and set it to Confirmed (or Cancelled) once handled — it then leaves this list.',
				'"View website" opens the public site in a new tab.'
			]
		},
		'/admin/appointments': {
			purpose: 'Every appointment request from the website, plus requests your team adds after a phone call.',
			points: [
				'Use the status tabs, filters and search (name, phone or reference) to find a request.',
				'Call or WhatsApp a patient with one tap, then open the request to change its status.',
				'"Add by phone" records a request taken over the phone.',
				'"Export CSV" downloads the current list for Excel or Google Sheets.'
			]
		},
		'/admin/appointments/[id]': {
			purpose: 'One appointment request in full: patient details, preferred time, and its history.',
			points: [
				'Call or WhatsApp the patient using the buttons at the top.',
				'Change the status (Confirmed, Rescheduled, Completed, Cancelled, No-show), date, time or ' + doctor + ' on the right, then Save.',
				'Add notes so colleagues know what was agreed. Every change is kept in the history.',
				'If the patient gave an email, they can be emailed automatically about confirmations and changes.'
			]
		},
		'/admin/appointments/calendar': {
			purpose: 'A week-at-a-glance view of appointments, most useful when patients book exact time slots.',
			points: ['Use the arrows to move between weeks. Cancelled requests are hidden.', 'Click an appointment to open it.']
		},
		'/admin/messages': {
			purpose: 'Messages sent through the website’s Contact page. They are saved here even if email notifications are not set up.',
			points: ['Call, WhatsApp or reply by email directly from each message.', 'Mark messages as read, or archive them to keep the inbox tidy.']
		},
		'/admin/slides': {
			purpose: 'The large photos at the top of the homepage, which fade from one to the next.',
			points: [
				'Add a slide with a photo, a heading, a short line of text and a button.',
				'Drag rows (or use ▲ ▼) to change the order — it saves automatically.',
				'Click “Visible/Hidden” to switch a slide on or off without deleting it.',
				'Slideshow settings below control speed, dots and arrows.'
			]
		},
		'/admin/homepage': {
			purpose: 'Choose which sections appear on the homepage, in what order, and what their headings say.',
			points: [
				'Drag sections to reorder them; the switch shows or hides a section.',
				'Click a section name to edit its small label, heading and intro text.',
				'"Edit items" takes you to the content shown inside that section.',
				'Also here: the site-wide notice banner and the warning about unofficial booking sites.'
			]
		},
		'/admin/locations': {
			purpose: `All your ${locations}. Each one gets its own page on the website and appears in booking, the footer and the map.`,
			points: [
				'Drag to change the order shown on the website — the first one is treated as the main branch.',
				'Hide a branch instead of deleting it to keep its appointment history.',
				'Click a name to edit its address, hours, map and photos.'
			]
		},
		'/admin/locations/[id]': {
			purpose: `Everything about one ${location}: address and contact details, Google Map, opening hours, holidays, photos, and which ${services} it offers.`,
			points: [
				'Map: in Google Maps choose Share (copy link) or “Embed a map” (copy HTML), paste it here and press “Use this map”.',
				'Opening hours support two sessions a day (e.g. 9:30–1:30 and 4–8). Add holidays so the branch shows as closed and cannot be booked.',
				'The notification email receives new appointment requests for this branch.',
				'Booking mode can switch this branch to exact time slots.'
			]
		},
		'/admin/doctors': {
			purpose: `The ${doctors} shown on the website, each with a profile page.`,
			points: [
				'Drag to change the order on the website.',
				'“Homepage” marks a profile that is featured on the homepage.',
				'Hidden profiles are kept but not shown to visitors.'
			]
		},
		'/admin/doctors/[id]': {
			purpose: `One ${doctor}’s profile: photos, qualifications, biography, and where and when they work.`,
			points: [
				'Upload a square photo for cards and a portrait one for the profile page — you can crop both in the browser.',
				`Tick every ${location} they work at, then set the days and times for each. Booking only offers these times.`,
				'Add leave dates so patients cannot request them on those days.',
				`Choose the ${services} they perform so they appear on those pages.`
			]
		},
		'/admin/services': {
			purpose: `The ${services} your clinic offers. Each has its own page and appears in the menu, grouped by category.`,
			points: ['Drag to change the order.', 'Hide a ' + service + ' to take it off the website without deleting it.']
		},
		'/admin/services/[id]': {
			purpose: `One ${service}’s page: description, benefits, what to expect, questions and price.`,
			points: [
				'The short description appears on cards and in Google results.',
				'Category decides where it is grouped in the menu.',
				`Choose the ${locations} that offer it and the ${doctors} who perform it.`,
				'Duration is used when patients book exact time slots.'
			]
		},
		'/admin/certifications': {
			purpose: 'Accreditations, memberships and awards that build patient trust. Shown on the homepage and the Certifications page.',
			points: ['Add the logo or certificate image, the issuing body and year.', 'You can attach the certificate as a PDF.', 'Drag to change the order.']
		},
		'/admin/content': {
			purpose: 'Short lists used around the website: “What brings you in?” cards, care steps, technology, amenities, testimonials, FAQs, gallery, payment options and plans.',
			points: ['Open a list to add, edit, hide or reorder items.', 'If a list’s module is switched off, it is not shown on the website.']
		},
		'/admin/content/[collection]': {
			purpose: 'The items in this list. They appear in the matching section of the website.',
			points: ['Add a new item with the button on the right.', 'Drag to reorder (saves automatically); click Visible/Hidden to show or hide an item.']
		},
		'/admin/pages': {
			purpose: 'Text pages such as About, Privacy policy and Terms, your own extra pages, and blog articles.',
			points: ['Pages appear at yoursite/page-name; articles at /blog/article-name.', 'Tick “Link in footer” to list a page in the footer.', 'The blog only appears when the Blog module is on.']
		},
		'/admin/pages/[id]': {
			purpose: 'Write or edit one page or article.',
			points: ['Use the toolbar for headings, bold text, lists and links.', 'Untick “Published” to keep it as a draft.', 'The excerpt is the short summary shown in lists and search results.']
		},
		'/admin/media': {
			purpose: 'All uploaded images and PDFs. Anything here can be reused anywhere on the site.',
			points: [
				'Images are shrunk and converted to a fast format in your browser before uploading.',
				'Every image needs alt text — a short description read aloud to blind visitors and used by Google.',
				'A file that is still used on the website cannot be deleted.'
			]
		},
		'/admin/settings': {
			purpose: 'Your clinic’s look and identity: colour theme, logo, fonts, name and contact details.',
			points: [
				'Colour theme: click a ready-made theme, or open “Customise colours” to use your exact brand colours. A message tells you if any text would be hard to read.',
				'Phone numbers, WhatsApp and email appear in the header, footer and contact page.',
				'The live preview on the right shows how colour and font changes will look.',
				'Time zone is used for opening hours and appointment times.'
			]
		},
		'/admin/settings/site': {
			purpose: 'Adapt the website to your kind of clinic, and turn whole sections on or off.',
			points: [
				'Clinic type tells Google what kind of clinic you are; “Use suggested wording” fills in matching words (e.g. Dentists, Treatments).',
				'Wording changes words everywhere on the website.',
				'Switching a module off hides its pages, menu items and homepage section.'
			]
		},
		'/admin/settings/booking': {
			purpose: 'How patients request appointments on the website.',
			points: [
				'Appointment request (recommended): patients pick a day and morning/afternoon/evening; your team calls to confirm.',
				'Live time slots: patients pick an exact time from each ' + doctor + '’s schedule.',
				'You can also edit the consent text, thank-you message and spam limits.'
			]
		},
		'/admin/settings/notifications': {
			purpose: 'Who gets told about new appointment requests, and how emails are sent.',
			points: [
				'Email is optional — the website works without it and requests always appear in Appointments.',
				'Choose an email provider and press “Send test email” to check it works.',
				'The WhatsApp template is the message pre-filled when staff tap WhatsApp on a request.'
			]
		},
		'/admin/settings/seo': {
			purpose: 'How your site appears in Google and when shared on WhatsApp or Facebook, plus analytics and spam protection.',
			points: [
				'The default description and sharing image are used when a page has none of its own.',
				'Add a Google Analytics ID to see visitor statistics (optional).',
				'Cloudflare Turnstile keys add a free, invisible spam check to the booking and contact forms.'
			]
		},
		'/admin/settings/chatbot': {
			purpose: 'An optional chat assistant on the website. It is off unless you switch it on here.',
			points: ['Paste a chat provider’s widget code, or connect your own chatbot service.', 'The chat button sits above the mobile Call/WhatsApp/Book bar.']
		},
		'/admin/integrations': {
			purpose: 'Connect the website to other software, such as practice management systems, CRMs, messaging or your own chatbot.',
			points: [
				'API keys let other systems read or create appointments. Each key is shown only once — copy it straight away.',
				'Webhooks notify another system automatically when an appointment or ' + doctor + ' changes.',
				'WhatsApp Business and SMS can message patients automatically (optional).'
			]
		},
		'/admin/integrations/webhooks/[id]': {
			purpose: 'A record of every message sent to this webhook address, and whether it arrived.',
			points: ['Failed deliveries are retried automatically for about 15 hours.', 'Use “Retry now” after fixing the receiving system; “Payload” shows exactly what was sent.']
		},
		'/admin/users': {
			purpose: 'The people who can sign in to this admin panel, and what each of them may do.',
			points: [
				'Super admin: everything, including settings and users.',
				'Clinic admin: all website content and all appointments.',
				'Branch staff: appointments for their own branch(es) only.',
				'Leave the password blank when adding someone to create a temporary one to share with them.'
			]
		},
		'/admin/audit': {
			purpose: 'A record of every change made in the admin panel or through the API: who did what, and when.',
			points: ['Search by person or description, or filter by type of item.', 'Useful for checking what changed if something on the website looks different.']
		},
		'/admin/account': {
			purpose: 'Your own sign-in details.',
			points: ['Change the name shown in the admin panel.', 'Change your password — you will stay signed in here, and other devices are signed out.']
		}
	};
	return routeId ? (HELP[routeId] ?? null) : null;
}
