import type { ClinicType } from '../../src/lib/settings/schema.js';
import type { WeeklyHours } from '../../src/lib/types.js';
import type { Profile, SeedService } from './types.js';
import { dentalProfile } from './dental.js';

type Compact = [name: string, category: string, icon: string, summary: string, minutes: number, price?: number];

function expand(list: Compact[]): SeedService[] {
	return list.map(([name, category, icon, summary, durationMinutes, price]) => ({
		name,
		category,
		icon,
		summary,
		content: `<p>${summary}</p><p>Your specialist will explain what to expect, answer your questions and agree a plan with you before anything begins.</p>`,
		benefits: ['Clear explanation of options', 'Experienced specialists', 'Follow-up included'],
		steps: [
			{ title: 'Consultation', description: 'We listen and assess your needs.' },
			{ title: 'Plan', description: 'Options, timings and costs explained.' },
			{ title: 'Treatment', description: 'Delivered carefully, with time for questions.' },
			{ title: 'Follow-up', description: 'We check your progress and adjust if needed.' }
		],
		faqs: [{ question: `How long does ${name.toLowerCase()} take?`, answer: `A typical appointment takes about ${durationMinutes} minutes.` }],
		durationMinutes,
		price
	}));
}

const day = (r: WeeklyHours[keyof WeeklyHours]) => r;
const am = [{ open: '09:30', close: '13:30' }];
const pm = [{ open: '16:00', close: '20:00' }];

function genericDoctors(titles: Array<[string, string, string[], string[]]>): Profile['doctors'] {
	const names = ['Lakshmi Pillai', 'Joseph Mathew', 'Sana Ibrahim', 'Vivek Krishnan'];
	return titles.map(([qualifications, summary, specialities, services], i) => ({
		name: names[i],
		qualifications,
		specialities,
		experienceYears: 6 + i * 3,
		languages: ['English', 'Malayalam', 'Hindi'],
		summary,
		bio: `<p>${summary}</p><p>Patients value the time taken to explain each step clearly and kindly.</p>`,
		registrationNumber: `REG-0000${i}`,
		featured: true,
		services,
		branches:
			i === 0
				? [
						{ location: 0, schedule: { mon: day(am), wed: day(am), fri: day(am) } },
						{ location: 1, schedule: { tue: day(pm), thu: day(pm) } }
					]
				: [{ location: i % 3, schedule: { mon: day(pm), tue: day(am), thu: day(am), sat: day(am) } }]
	}));
}

function derive(
	base: Profile,
	type: ClinicType,
	clinic: Profile['clinic'],
	services: Compact[],
	doctors: Array<[string, string, string[], string[]]>,
	intents: Profile['intents'],
	slides: Profile['slides'],
	technology: Profile['technology']
): Profile {
	const svcs = expand(services);
	return {
		...base,
		clinicType: type,
		clinic,
		services: svcs,
		doctors: genericDoctors(doctors),
		intents,
		slides,
		technology,
		about: `<p>${clinic.name} was founded to offer calm, honest and unhurried care. Every visit starts with a conversation, and every plan is explained clearly before treatment begins.</p>`,
		faqs: base.faqs.filter((f) => !/dent/i.test(f.question + f.answer)),
		testimonials: base.testimonials.map((t) => ({
			...t,
			text: t.text.replace(/root canal|implant|clear aligners|dentist/gi, 'treatment')
		})),
		membership: [],
		certifications: base.certifications.map((c) => ({ ...c, issuer: c.issuer.replace('Dental', 'Medical') }))
	};
}

const intents = (a: string, b: string): Profile['intents'] => [
	{ title: 'First visit', description: 'A relaxed first consultation with time for all your questions.', icon: 'calendar-check', links: [{ label: 'Request an appointment', href: '/book' }] },
	{ title: 'Need help today', description: 'Call your nearest branch and we will do our best to see you soon.', icon: 'siren', links: [{ label: 'Find a branch', href: '/locations' }] },
	{ title: a, description: b, icon: 'sparkles', links: [{ label: 'See treatments', href: '/services' }] },
	{ title: 'Payment questions', description: 'Insurance, cards, UPI and instalments.', icon: 'wallet', links: [{ label: 'Ask us', href: '/contact' }] }
];
const slides = (h1: string, h2: string): Profile['slides'] => [
	{ heading: h1, subheading: 'Calm, unhurried care across our branches.', buttonText: 'Book a visit', buttonLink: '/book', align: 'left' },
	{ heading: h2, subheading: 'Experienced specialists and modern equipment.', buttonText: 'Explore treatments', buttonLink: '/services', align: 'left' }
];

export function getProfile(type: ClinicType): Profile {
	switch (type) {
		case 'dental':
			return dentalProfile;
		case 'eye':
			return derive(
				dentalProfile,
				'eye',
				{ name: 'Clearview Eye Care', shortName: 'Clearview', tagline: 'Expert eye care, close to home', email: 'hello@example.com' },
				[
					['Comprehensive Eye Examination', 'General Eye Care', 'eye', 'A complete check of vision and eye health, including pressure and retina.', 30, 500],
					['Cataract Surgery', 'Surgery', 'scan-eye', 'Day-care cataract surgery with premium lens options.', 60, 25000],
					['LASIK & Refractive Surgery', 'Surgery', 'zap', 'Laser vision correction to reduce dependence on glasses.', 60, 45000],
					['Glaucoma Care', 'Medical Retina & Glaucoma', 'activity', 'Early detection and lifelong management of glaucoma.', 30, 800],
					['Diabetic Retina Screening', 'Medical Retina & Glaucoma', 'scan', 'Regular screening to protect vision in diabetes.', 30, 900],
					["Children's Eye Care", 'Paediatric', 'baby', 'Vision checks, squint and lazy-eye treatment for children.', 30, 600],
					['Contact Lenses & Spectacles', 'Optical', 'glasses', 'Precise prescriptions and fitting for lenses and frames.', 30, 300]
				],
				[
					['MBBS, MS (Ophthalmology)', 'Cataract and refractive surgeon.', ['Ophthalmologist', 'Cataract surgery'], ['Cataract Surgery', 'LASIK & Refractive Surgery', 'Comprehensive Eye Examination']],
					['MBBS, DNB (Ophthalmology)', 'Retina and glaucoma specialist.', ['Retina specialist'], ['Glaucoma Care', 'Diabetic Retina Screening']],
					['MBBS, DO', "Paediatric ophthalmologist.", ['Paediatric ophthalmology'], ["Children's Eye Care", 'Comprehensive Eye Examination']],
					['B.Optom', 'Optometrist for lenses and spectacles.', ['Optometrist'], ['Contact Lenses & Spectacles']]
				],
				intents('Freedom from glasses', 'Explore LASIK and lens options.'),
				slides('Clear vision, gentle care', 'See the world more clearly'),
				[
					{ title: 'Optical coherence tomography', description: 'Detailed scans of the retina.', icon: 'scan-line' },
					{ title: 'Femto-laser platform', description: 'Precise, blade-free laser surgery.', icon: 'zap' }
				]
			);
		case 'skin':
			return derive(
				dentalProfile,
				'skin',
				{ name: 'Lumen Skin Clinic', shortName: 'Lumen', tagline: 'Healthy skin, honest advice', email: 'hello@example.com' },
				[
					['Acne Treatment', 'Medical Dermatology', 'droplet', 'Personalised plans to clear acne and prevent scarring.', 30, 1000],
					['Pigmentation & Melasma', 'Medical Dermatology', 'sun', 'Treatment for dark spots, melasma and uneven tone.', 30, 1500],
					['Hair Loss Treatment', 'Hair', 'leaf', 'Diagnosis and treatment of hair fall and thinning.', 30, 1200],
					['Chemical Peels', 'Aesthetic', 'sparkles', 'Peels to brighten skin and improve texture.', 45, 2500],
					['Laser Hair Reduction', 'Aesthetic', 'zap', 'Long-lasting hair reduction with medical lasers.', 45, 3000],
					['Eczema & Psoriasis Care', 'Medical Dermatology', 'hand', 'Long-term control of chronic skin conditions.', 30, 900]
				],
				[
					['MBBS, MD (Dermatology)', 'Consultant dermatologist.', ['Dermatologist'], ['Acne Treatment', 'Pigmentation & Melasma', 'Eczema & Psoriasis Care']],
					['MBBS, DVL', 'Hair and laser specialist.', ['Trichology', 'Lasers'], ['Hair Loss Treatment', 'Laser Hair Reduction']],
					['MBBS, MD (DVL)', 'Aesthetic dermatologist.', ['Aesthetics'], ['Chemical Peels', 'Pigmentation & Melasma']]
				],
				intents('Glowing skin', 'Peels, lasers and skincare plans.'),
				slides('Healthy skin, honest advice', 'Treatments that respect your skin'),
				[{ title: 'Medical-grade lasers', description: 'US-FDA approved laser platforms.', icon: 'zap' }]
			);
		case 'physio':
			return derive(
				dentalProfile,
				'physio',
				{ name: 'Motion Physiotherapy', shortName: 'Motion', tagline: 'Move better, feel better', email: 'hello@example.com' },
				[
					['Back & Neck Pain', 'Musculoskeletal', 'activity', 'Assessment and exercise-based care for spinal pain.', 45, 800],
					['Sports Injury Rehab', 'Sports', 'dumbbell', 'Return to sport safely after injury.', 45, 1000],
					['Post-surgery Rehabilitation', 'Rehabilitation', 'bone', 'Guided recovery after joint replacement and surgery.', 45, 900],
					['Neuro Rehabilitation', 'Neurological', 'brain', 'Therapy after stroke and for neurological conditions.', 60, 1200],
					['Home Visits', 'Home Care', 'house', 'Physiotherapy in the comfort of your home.', 60, 1500]
				],
				[
					['BPT, MPT (Orthopaedics)', 'Musculoskeletal physiotherapist.', ['Orthopaedic physiotherapy'], ['Back & Neck Pain', 'Post-surgery Rehabilitation']],
					['BPT, MPT (Sports)', 'Sports physiotherapist.', ['Sports physiotherapy'], ['Sports Injury Rehab']],
					['BPT, MPT (Neurology)', 'Neuro physiotherapist.', ['Neuro rehabilitation'], ['Neuro Rehabilitation', 'Home Visits']]
				],
				intents('Get back to sport', 'Rehab programmes built around your goals.'),
				slides('Move better, feel better', 'Personal programmes, real progress'),
				[{ title: 'Gait analysis', description: 'Video analysis of walking and running.', icon: 'footprints' }]
			);
		case 'general':
		case 'other':
		default:
			return derive(
				dentalProfile,
				type,
				{ name: 'Harbour Family Clinic', shortName: 'Harbour', tagline: 'Family doctors who know you', email: 'hello@example.com' },
				[
					['General Consultation', 'Primary Care', 'stethoscope', 'Consultations for illness, injury and ongoing conditions.', 15, 400],
					['Health Check-ups', 'Preventive Care', 'clipboard-list', 'Age-appropriate screening packages.', 45, 2500],
					['Vaccinations', 'Preventive Care', 'syringe', 'Childhood, adult and travel vaccines.', 15, 500],
					['Diabetes Care', 'Chronic Care', 'heart-pulse', 'Regular reviews to keep diabetes under control.', 30, 600],
					["Children's Health", 'Paediatrics', 'baby', 'Growth checks, vaccines and care for common illnesses.', 20, 500],
					['Minor Procedures', 'Procedures', 'briefcase-medical', 'Dressings, suturing and minor surgical procedures.', 30, 1000]
				],
				[
					['MBBS, MD (General Medicine)', 'Consultant physician.', ['General medicine', 'Diabetes'], ['General Consultation', 'Diabetes Care', 'Health Check-ups']],
					['MBBS, DCH', 'Paediatrician.', ['Paediatrics'], ["Children's Health", 'Vaccinations']],
					['MBBS, DNB (Family Medicine)', 'Family physician.', ['Family medicine'], ['General Consultation', 'Minor Procedures']]
				],
				intents('Health check-up', 'Screening packages for every age.'),
				slides('Family doctors who know you', 'Care for every stage of life'),
				[{ title: 'In-house lab', description: 'Common tests with same-day results.', icon: 'microscope' }]
			);
	}
}
