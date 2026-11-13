import type { Profile, SeedService } from './types.js';
import type { WeeklyHours } from '../../src/lib/types.js';

const am = { open: '09:30', close: '13:30' };
const pm = { open: '16:00', close: '20:00' };
const sched = (days: Array<keyof WeeklyHours>, ranges = [am]): WeeklyHours =>
	Object.fromEntries(days.map((d) => [d, ranges]));

const svc = (s: Omit<SeedService, 'content'> & { paragraphs: string[] }): SeedService => ({
	...s,
	content: s.paragraphs.map((p) => `<p>${p}</p>`).join('\n')
});

const services: SeedService[] = [
	svc({
		name: 'Check-up & Cleaning',
		category: 'General & Preventive',
		icon: 'tooth',
		summary: 'A thorough examination, gentle scale and polish, and a clear plan for keeping your teeth healthy.',
		paragraphs: [
			'Regular check-ups catch small problems before they become painful or expensive. We examine your teeth, gums and bite, take X-rays only when they are needed, and talk you through what we find.',
			'Professional cleaning removes the hardened plaque (tartar) that brushing cannot, leaving your mouth fresh and your gums healthier.'
		],
		benefits: ['Find problems early', 'Fresher breath and healthier gums', 'A personalised home-care routine'],
		steps: [
			{ title: 'Conversation', description: 'We ask about any concerns, your medical history and habits.' },
			{ title: 'Examination', description: 'A careful look at teeth, gums, bite and soft tissues.' },
			{ title: 'Cleaning', description: 'Ultrasonic scaling and polishing to remove tartar and stains.' },
			{ title: 'Plan', description: 'Clear advice and, if needed, a written treatment plan with costs.' }
		],
		faqs: [
			{ question: 'How often should I come for a check-up?', answer: 'Every six months suits most people; we may suggest more often if you have gum problems.' },
			{ question: 'Does cleaning damage enamel?', answer: 'No. Professional scaling removes deposits, not enamel.' }
		],
		durationMinutes: 30,
		price: 800
	}),
	svc({
		name: 'Fillings',
		category: 'General & Preventive',
		icon: 'shield-check',
		summary: 'Tooth-coloured fillings that repair cavities and blend in naturally.',
		paragraphs: [
			'When decay is caught early, a simple filling restores the tooth. We use tooth-coloured composite that bonds to the tooth and matches its shade.',
			'Most fillings take a single visit and are done under local anaesthetic so you stay comfortable.'
		],
		benefits: ['Natural-looking result', 'Usually one visit', 'Stops decay from spreading'],
		steps: [
			{ title: 'Numbing', description: 'A gentle local anaesthetic so you feel no pain.' },
			{ title: 'Cleaning the cavity', description: 'Decay is removed and the tooth is prepared.' },
			{ title: 'Filling', description: 'Composite is placed in layers, shaped and hardened with light.' }
		],
		faqs: [{ question: 'How long do fillings last?', answer: 'Typically 7–10 years or more with good care.' }],
		durationMinutes: 45,
		price: 1500
	}),
	svc({
		name: 'Root Canal Treatment',
		category: 'Restorative',
		icon: 'activity',
		summary: 'Save an infected or badly decayed tooth with modern, comfortable root canal treatment.',
		paragraphs: [
			'A root canal removes infection from inside the tooth, relieving pain and saving the tooth from extraction. With rotary instruments and good anaesthesia, it feels much like a long filling.',
			'Afterwards the tooth is usually protected with a crown so it can last for many years.'
		],
		benefits: ['Relieves toothache', 'Keeps your natural tooth', 'Often completed in one or two visits'],
		steps: [
			{ title: 'Diagnosis', description: 'X-ray and tests to confirm the tooth can be saved.' },
			{ title: 'Cleaning the canals', description: 'Infected pulp is removed and the canals disinfected.' },
			{ title: 'Sealing', description: 'Canals are filled and sealed to prevent re-infection.' },
			{ title: 'Crown', description: 'A crown restores strength and appearance.' }
		],
		faqs: [
			{ question: 'Is a root canal painful?', answer: 'Most patients say it feels no worse than a filling. The pain usually comes from the infection, which the treatment removes.' },
			{ question: 'Do I always need a crown afterwards?', answer: 'Back teeth almost always need one; front teeth sometimes do not. We will advise you.' }
		],
		durationMinutes: 60,
		price: 4500
	}),
	svc({
		name: 'Dental Implants',
		category: 'Implants & Surgery',
		icon: 'implant',
		summary: 'Replace missing teeth with implants that look, feel and work like natural teeth.',
		paragraphs: [
			'An implant is a small titanium post placed in the jaw that acts as a new root. Once it has healed, a custom crown, bridge or denture is attached to it.',
			'We plan each implant carefully with 3D imaging so that placement is precise and recovery is quick.'
		],
		benefits: ['Fixed, natural-looking teeth', 'Protects the jawbone', 'No need to cut neighbouring teeth'],
		steps: [
			{ title: 'Assessment', description: 'Examination and 3D scan to check bone and plan the implant.' },
			{ title: 'Placement', description: 'The implant is placed under local anaesthetic.' },
			{ title: 'Healing', description: 'Usually 8–12 weeks while the implant fuses with bone.' },
			{ title: 'Final tooth', description: 'A custom crown is fitted to the implant.' }
		],
		faqs: [
			{ question: 'Am I suitable for implants?', answer: 'Most healthy adults are. Smoking, diabetes and bone loss need extra planning, which we will discuss.' },
			{ question: 'How long do implants last?', answer: 'With good care, many last for decades.' }
		],
		durationMinutes: 90,
		price: 30000
	}),
	svc({
		name: 'Crowns & Bridges',
		category: 'Restorative',
		icon: 'award',
		summary: 'Strong, natural-looking caps and bridges to restore damaged or missing teeth.',
		paragraphs: [
			'A crown covers a weak or heavily filled tooth to protect it. A bridge replaces a missing tooth by anchoring to the teeth on either side.',
			'We offer metal-free ceramic and zirconia options that match your natural teeth.'
		],
		benefits: ['Restores strength and shape', 'Natural appearance', 'Long-lasting materials'],
		steps: [
			{ title: 'Preparation', description: 'The tooth is shaped and a digital or traditional impression taken.' },
			{ title: 'Temporary', description: 'A temporary crown protects the tooth.' },
			{ title: 'Fitting', description: 'Your permanent crown is checked and cemented.' }
		],
		faqs: [{ question: 'Which material is best?', answer: 'Zirconia is very strong for back teeth; layered ceramic gives the most lifelike look for front teeth.' }],
		durationMinutes: 60,
		price: 6000
	}),
	svc({
		name: 'Teeth Whitening',
		category: 'Cosmetic',
		icon: 'sparkles',
		summary: 'Professional whitening that brightens your smile safely, in the clinic or at home.',
		paragraphs: [
			'Professional whitening lifts stains from coffee, tea and age far more effectively than whitening toothpastes, and is supervised to protect your gums and enamel.',
			'Choose a one-hour in-clinic session or custom trays to use at home.'
		],
		benefits: ['Several shades brighter', 'Safe and supervised', 'In-clinic or at-home options'],
		steps: [
			{ title: 'Check-up', description: 'We make sure teeth and gums are healthy first.' },
			{ title: 'Whitening', description: 'Gel is applied in the clinic or with custom trays at home.' },
			{ title: 'Aftercare', description: 'Simple tips to keep your smile bright.' }
		],
		faqs: [{ question: 'Will whitening make my teeth sensitive?', answer: 'Some people feel mild sensitivity for a day or two. We use desensitising gels to reduce it.' }],
		durationMinutes: 60,
		price: 8000
	}),
	svc({
		name: 'Veneers & Smile Makeover',
		category: 'Cosmetic',
		icon: 'sparkles',
		summary: 'Thin porcelain or composite veneers to reshape and brighten your smile.',
		paragraphs: [
			'Veneers are thin shells bonded to the front of teeth to change their colour, shape or size. A smile makeover may combine veneers with whitening, gum contouring or orthodontics.',
			'We design your new smile digitally first, so you can see and approve the result before treatment.'
		],
		benefits: ['Digital smile preview', 'Minimal tooth reduction', 'Stain-resistant porcelain'],
		steps: [
			{ title: 'Smile design', description: 'Photos, scans and a digital mock-up of your new smile.' },
			{ title: 'Trial', description: 'A temporary try-in so you can see the shape in your mouth.' },
			{ title: 'Bonding', description: 'Final veneers are bonded and polished.' }
		],
		faqs: [{ question: 'How long do veneers last?', answer: 'Porcelain veneers commonly last 10–15 years.' }],
		durationMinutes: 60,
		price: 12000
	}),
	svc({
		name: 'Braces & Clear Aligners',
		category: 'Orthodontics',
		icon: 'braces',
		summary: 'Straighten teeth with metal, ceramic or clear aligner treatment for teens and adults.',
		paragraphs: [
			'Straighter teeth are easier to clean and can improve your bite as well as your confidence. We offer traditional metal braces, tooth-coloured ceramic braces and clear removable aligners.',
			'Your orthodontist will recommend the option that suits your teeth and lifestyle.'
		],
		benefits: ['Options for every age', 'Clear aligners are nearly invisible', 'Better bite and easier cleaning'],
		steps: [
			{ title: 'Consultation', description: 'Examination, photos and X-rays.' },
			{ title: 'Treatment plan', description: 'Options, duration and costs explained.' },
			{ title: 'Treatment', description: 'Regular reviews every 4–8 weeks.' },
			{ title: 'Retainers', description: 'Retainers keep your new smile in place.' }
		],
		faqs: [
			{ question: 'Am I too old for braces?', answer: 'No — many of our orthodontic patients are adults.' },
			{ question: 'How long does treatment take?', answer: 'Usually 12–24 months, depending on the case.' }
		],
		durationMinutes: 45,
		price: 35000
	}),
	svc({
		name: 'Wisdom Tooth Removal',
		category: 'Implants & Surgery',
		icon: 'stethoscope',
		summary: 'Gentle, careful removal of painful or impacted wisdom teeth.',
		paragraphs: [
			'Wisdom teeth that are stuck (impacted) or keep getting infected are often best removed. Our surgeons use careful techniques to keep discomfort and swelling to a minimum.'
		],
		benefits: ['Ends recurring pain and infection', 'Careful surgical technique', 'Clear aftercare instructions'],
		steps: [
			{ title: 'X-ray', description: 'To see the tooth position and nearby nerves.' },
			{ title: 'Removal', description: 'Under local anaesthetic, with sedation available.' },
			{ title: 'Recovery', description: 'Most people are back to normal in a few days.' }
		],
		faqs: [{ question: 'Will my face swell?', answer: 'Some swelling is normal for 2–3 days; cold packs and the medicines we prescribe help.' }],
		durationMinutes: 60,
		price: 5000
	}),
	svc({
		name: "Children's Dentistry",
		category: 'Children',
		icon: 'baby',
		summary: 'Friendly, patient care that helps children enjoy visiting the dentist.',
		paragraphs: [
			'We see children from their first tooth. Visits are short, playful and explained in words children understand, so they grow up without fear of the dentist.',
			'Preventive care such as fluoride varnish and fissure sealants protects young teeth from decay.'
		],
		benefits: ['Calm, child-friendly rooms', 'Preventive sealants and fluoride', 'Advice for parents'],
		steps: [
			{ title: 'Meet and greet', description: 'Time to get comfortable with the room and the team.' },
			{ title: 'Gentle check', description: 'A quick look and clean.' },
			{ title: 'Prevention', description: 'Fluoride or sealants if needed.' }
		],
		faqs: [{ question: 'When should my child first see a dentist?', answer: 'By their first birthday, or within six months of the first tooth appearing.' }],
		durationMinutes: 30,
		price: 600
	}),
	svc({
		name: 'Gum Care',
		category: 'General & Preventive',
		icon: 'heart-pulse',
		summary: 'Treatment for bleeding gums, gum disease and bad breath.',
		paragraphs: [
			'Bleeding gums are often the first sign of gum disease. Deep cleaning below the gum line, together with a good home routine, can stop the disease and protect the bone that holds your teeth.'
		],
		benefits: ['Stops bleeding gums', 'Protects teeth from loosening', 'Fresher breath'],
		steps: [
			{ title: 'Gum assessment', description: 'Measuring gum pockets and checking bone levels.' },
			{ title: 'Deep cleaning', description: 'Root planing under local anaesthetic where needed.' },
			{ title: 'Review', description: 'A follow-up visit to check healing.' }
		],
		faqs: [{ question: 'Can gum disease be cured?', answer: 'Early gum disease (gingivitis) can be reversed. Advanced disease can be controlled with treatment and regular care.' }],
		durationMinutes: 45,
		price: 2500
	}),
	svc({
		name: 'Dentures',
		category: 'Restorative',
		icon: 'tooth',
		summary: 'Comfortable full and partial dentures, including implant-supported options.',
		paragraphs: [
			'Modern dentures are lighter, better fitting and more natural-looking than ever. Implant-supported dentures clip securely in place for extra confidence when eating and speaking.'
		],
		benefits: ['Natural-looking teeth', 'Comfortable fit', 'Implant-retained options'],
		steps: [
			{ title: 'Impressions', description: 'Accurate moulds of your mouth.' },
			{ title: 'Try-in', description: 'Check the look and bite before the final denture is made.' },
			{ title: 'Fitting', description: 'Adjustments for comfort, with follow-up reviews.' }
		],
		faqs: [{ question: 'How long does it take to get used to dentures?', answer: 'Most people adapt within a few weeks.' }],
		durationMinutes: 45,
		price: 15000
	})
];

export const dentalProfile: Profile = {
	clinicType: 'dental',
	clinic: {
		name: 'Orchid Dental Care',
		shortName: 'Orchid Dental',
		tagline: 'Gentle dentistry for the whole family',
		email: 'hello@example.com'
	},
	about: `<p>We started with a simple idea: dental care should feel calm, honest and unhurried. Today our team of dentists and specialists cares for families across the city, from a child's first check-up to complete smile restorations.</p>
<p>Every treatment begins with a conversation. We explain what we see, show you the options and their costs, and let you decide. No pressure, no surprises.</p>
<h2>What we believe</h2>
<ul><li><strong>Comfort first.</strong> Gentle techniques, good anaesthesia and time to ask questions.</li><li><strong>Clear advice.</strong> Written treatment plans and honest pricing.</li><li><strong>Strict hygiene.</strong> Hospital-grade sterilisation for every instrument, every time.</li></ul>`,
	slides: [
		{ heading: 'Gentle dentistry, close to home', subheading: 'Calm, unhurried care for the whole family across three branches.', buttonText: 'Book a visit', buttonLink: '/book', align: 'left' },
		{ heading: 'A smile you feel good about', subheading: 'Whitening, aligners and smile makeovers, planned with you.', buttonText: 'Explore treatments', buttonLink: '/services', align: 'left' },
		{ heading: 'In pain? We can help today', subheading: 'Call your nearest branch and we will do our best to see you the same day.', buttonText: 'Find a branch', buttonLink: '/locations', align: 'left' }
	],
	services,
	doctors: [
		{
			name: 'Anjali Menon',
			qualifications: 'BDS, MDS (Prosthodontics)',
			specialities: ['Prosthodontist', 'Implants', 'Smile design'],
			experienceYears: 14,
			languages: ['English', 'Malayalam', 'Hindi'],
			summary: 'Leads our implant and smile-design team, known for patient explanations and natural-looking results.',
			bio: '<p>Dr. Anjali completed her MDS in Prosthodontics and has focused on implants and full-mouth rehabilitation for over a decade.</p><p>She believes patients should understand every option before deciding, and is known for her careful planning and calm chairside manner.</p>',
			registrationNumber: 'KDC-00000',
			featured: true,
			services: ['Dental Implants', 'Crowns & Bridges', 'Veneers & Smile Makeover', 'Dentures'],
			branches: [
				{ location: 0, schedule: sched(['mon', 'wed', 'fri'], [am]) },
				{ location: 1, schedule: sched(['tue', 'thu'], [pm]) }
			]
		},
		{
			name: 'Rahul Varghese',
			qualifications: 'BDS, MDS (Orthodontics)',
			specialities: ['Orthodontist', 'Clear aligners'],
			experienceYears: 11,
			languages: ['English', 'Malayalam', 'Tamil'],
			summary: 'Straightens smiles for teens and adults with braces and clear aligners.',
			bio: '<p>Dr. Rahul is a specialist orthodontist who treats children, teenagers and adults. He is certified in several clear aligner systems.</p>',
			registrationNumber: 'KDC-00001',
			featured: true,
			services: ['Braces & Clear Aligners'],
			branches: [
				{ location: 0, schedule: sched(['tue', 'sat'], [pm]) },
				{ location: 1, schedule: sched(['mon', 'thu'], [am]) },
				{ location: 2, schedule: sched(['fri'], [{ open: '10:00', close: '14:00' }]) }
			]
		},
		{
			name: 'Fathima Rasheed',
			qualifications: 'BDS, MDS (Conservative Dentistry & Endodontics)',
			specialities: ['Endodontist', 'Root canal treatment'],
			experienceYears: 9,
			languages: ['English', 'Malayalam', 'Arabic'],
			summary: 'Specialist in painless root canal treatment and saving natural teeth.',
			bio: '<p>Dr. Fathima specialises in root canal treatment and restorative dentistry, using rotary instruments and magnification for precise, comfortable care.</p>',
			registrationNumber: 'KDC-00002',
			featured: true,
			services: ['Root Canal Treatment', 'Fillings', 'Crowns & Bridges'],
			branches: [
				{ location: 1, schedule: sched(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], [am, pm]) }
			]
		},
		{
			name: 'Arjun Nair',
			qualifications: 'BDS',
			specialities: ['General dentist', "Children's dentistry"],
			experienceYears: 6,
			languages: ['English', 'Malayalam'],
			summary: 'Our family dentist — patient with nervous adults and great with children.',
			bio: "<p>Dr. Arjun looks after check-ups, fillings, gum care and children's dentistry. Parents often mention how relaxed their children are in his chair.</p>",
			registrationNumber: 'KDC-00003',
			featured: true,
			services: ['Check-up & Cleaning', 'Fillings', "Children's Dentistry", 'Gum Care', 'Teeth Whitening', 'Wisdom Tooth Removal'],
			branches: [
				{ location: 0, schedule: sched(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], [pm]) },
				{ location: 2, schedule: sched(['mon', 'wed'], [{ open: '10:00', close: '18:00' }]) }
			]
		}
	],
	intents: [
		{ title: 'First visit', description: 'A relaxed check-up and clean, with time for all your questions.', icon: 'calendar-check', links: [{ label: 'Book a check-up', href: '/book?service=check-up-cleaning' }, { label: 'What to expect', href: '/services/check-up-cleaning' }] },
		{ title: 'Need help today', description: 'Toothache, swelling or a broken tooth? Call your nearest branch.', icon: 'siren', links: [{ label: 'Find a branch', href: '/locations' }, { label: 'Request a visit', href: '/book' }] },
		{ title: 'Improve my smile', description: 'Whitening, aligners and veneers, planned around you.', icon: 'sparkles', links: [{ label: 'Cosmetic treatments', href: '/services#cosmetic' }, { label: 'Clear aligners', href: '/services/braces-clear-aligners' }] },
		{ title: 'Payment questions', description: 'Insurance, cards, UPI and easy instalments.', icon: 'wallet', links: [{ label: 'Payment options', href: '/#insurance' }, { label: 'Ask us', href: '/contact' }] }
	],
	process: [
		{ title: 'Listen', description: 'We start with your concerns, your history and what you would like to achieve.' },
		{ title: 'Examine', description: 'A thorough, gentle examination with digital X-rays only when needed.' },
		{ title: 'Explain', description: 'Clear options, written costs and time to decide — no pressure.' },
		{ title: 'Care', description: 'Comfortable treatment and a follow-up plan to keep you healthy.' }
	],
	technology: [
		{ title: 'Digital X-rays', description: 'Instant images with a fraction of the radiation of film.', icon: 'scan' },
		{ title: '3D CBCT imaging', description: 'Precise planning for implants and complex cases.', icon: 'scan-line' },
		{ title: 'Intraoral scanner', description: 'No messy impressions for crowns and aligners.', icon: 'monitor' },
		{ title: 'Class B sterilisation', description: 'Hospital-grade autoclaves for every instrument.', icon: 'shield-check' }
	],
	amenities: [
		{ title: 'Wheelchair access', icon: 'accessibility' },
		{ title: 'Free parking', icon: 'car' },
		{ title: 'Free Wi-Fi', icon: 'wifi' },
		{ title: 'Kids’ corner', icon: 'baby' },
		{ title: 'Tea & coffee', icon: 'coffee' },
		{ title: 'Comfortable lounge', icon: 'armchair' }
	],
	testimonials: [
		{ name: 'Priya S.', rating: 5, text: 'I have always been nervous at the dentist, but the team explained every step and I felt no pain at all during my root canal.', source: 'Google', date: '2026-08-14' },
		{ name: 'Thomas K.', rating: 5, text: 'Clean clinic, on time, and the doctor showed me my X-rays and explained the options with prices. Very honest.', source: 'Google', date: '2026-07-02' },
		{ name: 'Meera R.', rating: 5, text: 'My daughter actually looks forward to her check-ups now. Thank you for being so patient with her!', source: 'Google', date: '2026-06-21' },
		{ name: 'Suresh P.', rating: 4, text: 'Got my implant done here. Careful planning and good follow-up. Parking can be busy in the evening.', source: 'Practo', date: '2026-05-10' },
		{ name: 'Ayesha M.', rating: 5, text: 'Clear aligners changed my smile in under a year. Friendly staff at both Edappally and Kakkanad.', source: 'Google', date: '2026-04-28' }
	],
	faqs: [
		{ question: 'Do you accept walk-ins?', answer: '<p>Yes, but there may be a wait. Requesting an appointment online or by phone is the best way to be seen on time.</p>' },
		{ question: 'What should I do in a dental emergency?', answer: '<p>Call your nearest branch straight away. We keep time aside every day for urgent cases such as severe pain, swelling or a broken tooth.</p>' },
		{ question: 'Do you treat children?', answer: '<p>Yes. We see children from their first tooth, in a calm and friendly setting.</p>' },
		{ question: 'Which payment methods do you accept?', answer: '<p>Cash, all major cards, UPI and net banking. Instalment plans are available for larger treatments.</p>' },
		{ question: 'Do you accept dental insurance?', answer: '<p>We provide detailed invoices and documents for reimbursement claims. Please check your policy for dental cover.</p>' },
		{ question: 'How do you keep instruments safe and sterile?', answer: '<p>Every instrument is cleaned, packed and sterilised in a Class B autoclave, and single-use items are never reused.</p>' }
	],
	certifications: [
		{ title: 'Quality Management Certified', issuer: 'Example Quality Council', year: 2024, description: 'Independent audit of clinical and administrative processes.' },
		{ title: 'Patient Safety Accreditation', issuer: 'Example Healthcare Standards Board', year: 2023, description: 'Recognises safe clinical practice and patient rights.' },
		{ title: 'Infection Control Audit', issuer: 'Example Hygiene Institute', year: 2025, description: 'Annual audit of sterilisation and infection control.' },
		{ title: 'Excellence in Patient Care', issuer: 'Example Dental Association', year: 2025, description: 'Awarded for patient experience and outcomes.' }
	],
	insurance: [
		{ title: 'Cards & UPI', description: 'All major debit and credit cards, UPI and net banking.', icon: 'credit-card' },
		{ title: 'Easy instalments', description: 'No-cost EMI options for implants, aligners and larger treatment plans.', icon: 'wallet' },
		{ title: 'Insurance claims', description: 'Detailed invoices and reports to help you claim reimbursement.', icon: 'file-text' },
		{ title: 'Corporate tie-ups', description: 'Special rates for employees of partner companies.', icon: 'users' }
	],
	membership: [
		{ name: 'Smile Care', price: '₹2,499', period: 'per year', description: 'For healthy adults who want to stay that way.', features: ['2 check-ups and cleanings', '1 set of X-rays', '10% off other treatment'] },
		{ name: 'Family Care', price: '₹7,999', period: 'per year', description: 'Cover for up to four family members.', features: ['2 check-ups and cleanings each', 'Fluoride for children', '15% off other treatment', 'Priority appointments'], highlighted: true }
	]
};
