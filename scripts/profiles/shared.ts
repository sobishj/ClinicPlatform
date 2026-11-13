import type { WeeklyHours } from '../../src/lib/types.js';

/** Demo branches (fictional addresses and numbers). Replace through the admin panel. */
export const DEMO_LOCATIONS = [
	{
		name: 'Kakkanad',
		type: 'Head Office',
		addressLine1: '1st Floor, Demo Arcade, Seaport–Airport Road',
		area: 'Kakkanad',
		city: 'Kochi',
		state: 'Kerala',
		postalCode: '682030',
		phones: ['+91 484 000 0101'],
		whatsapp: '+91 90000 00101',
		email: 'kakkanad@example.com',
		latitude: 10.0159,
		longitude: 76.3419,
		summary: 'Our largest branch, with dedicated rooms for surgery and children.',
		photo: '/demo/location-1.svg'
	},
	{
		name: 'Edappally',
		type: 'Branch',
		addressLine1: 'Ground Floor, Sample Towers, NH 66 Bypass',
		area: 'Edappally',
		city: 'Kochi',
		state: 'Kerala',
		postalCode: '682024',
		phones: ['+91 484 000 0202'],
		whatsapp: '+91 90000 00202',
		email: 'edappally@example.com',
		latitude: 10.0261,
		longitude: 76.3083,
		summary: 'Easy to reach from the bypass, with evening appointments six days a week.',
		photo: '/demo/location-2.svg'
	},
	{
		name: 'Vyttila',
		type: 'Satellite Clinic',
		addressLine1: 'Example Building, Near Mobility Hub',
		area: 'Vyttila',
		city: 'Kochi',
		state: 'Kerala',
		postalCode: '682019',
		phones: ['+91 484 000 0303'],
		whatsapp: '+91 90000 00303',
		email: 'vyttila@example.com',
		latitude: 9.9658,
		longitude: 76.3189,
		summary: 'A calm neighbourhood clinic for check-ups and follow-up visits.',
		photo: '/demo/location-3.svg'
	}
];

const split = [
	{ open: '09:30', close: '13:30' },
	{ open: '16:00', close: '20:00' }
];

export const DEMO_HOURS: WeeklyHours[] = [
	{ mon: split, tue: split, wed: split, thu: split, fri: split, sat: split, sun: [{ open: '10:00', close: '13:00' }] },
	{ mon: split, tue: split, wed: split, thu: split, fri: split, sat: split },
	{ mon: [{ open: '10:00', close: '18:00' }], wed: [{ open: '10:00', close: '18:00' }], fri: [{ open: '10:00', close: '18:00' }], sat: [{ open: '10:00', close: '14:00' }] }
];

export const PRIVACY_HTML = (clinic: string) => `
<p><em>This is a starting template. Please review it with your legal adviser before publishing.</em></p>
<h2>Who we are</h2>
<p>${clinic} ("we", "us") operates this website. We act as the Data Fiduciary for the personal data you share with us through it, under India's Digital Personal Data Protection Act, 2023 (DPDP Act).</p>
<h2>What we collect</h2>
<ul>
<li>Details you enter when requesting an appointment or contacting us: your name, mobile number, optional email address, preferred branch, doctor, date and any notes you choose to add.</li>
<li>Basic technical data needed to keep the site secure (for example, an anonymised IP address used for spam protection).</li>
</ul>
<h2>Why we use it</h2>
<p>We use your details only to arrange and confirm your appointment, to contact you about it, and to keep our records as required by law. We do not sell your data or use it for advertising.</p>
<h2>Consent</h2>
<p>We process your data on the basis of the consent you give when you tick the consent box on our forms. You can withdraw consent at any time by contacting us; this will not affect processing already carried out.</p>
<h2>Sharing</h2>
<p>We share your data only with staff at the branch you choose and with service providers who help us run this website (hosting, email delivery, spam protection), under contracts that require them to protect it.</p>
<h2>How long we keep it</h2>
<p>Appointment requests are kept for as long as needed to provide care and to meet our legal and professional record-keeping obligations, and are then deleted.</p>
<h2>Your rights</h2>
<p>You can ask us to access, correct or erase your personal data, or to nominate someone to act for you, and you can raise a grievance with us. Contact us using the details on our contact page. If you are not satisfied with our response, you may approach the Data Protection Board of India.</p>
<h2>Children</h2>
<p>Appointments for children under 18 should be requested by a parent or guardian.</p>
`;

export const TERMS_HTML = (clinic: string) => `
<p><em>This is a starting template. Please review it with your legal adviser before publishing.</em></p>
<h2>About this website</h2>
<p>This website gives general information about ${clinic} and lets you request appointments. It does not provide medical advice and is not a substitute for a consultation.</p>
<h2>Appointment requests</h2>
<p>Submitting a request does not guarantee an appointment. Our team will contact you to confirm a time. In an emergency, please call the branch directly or visit the nearest emergency department.</p>
<h2>Fees</h2>
<p>Any prices shown are indicative starting prices. Your final treatment cost will be explained to you before treatment begins.</p>
<h2>Third-party booking sites</h2>
<p>We are not responsible for bookings made through websites or apps we do not operate. Please use this website or our official phone numbers.</p>
`;
