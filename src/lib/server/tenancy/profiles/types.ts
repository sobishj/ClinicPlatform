import type { WeeklyHours, ProcedureStep, ServiceFaq } from '../../../types.js';
import type { ClinicType } from '../../../settings/schema.js';

export interface SeedService {
	name: string;
	category: string;
	icon: string;
	summary: string;
	content: string;
	benefits: string[];
	steps: ProcedureStep[];
	faqs: ServiceFaq[];
	durationMinutes: number;
	price?: number;
}

export interface SeedDoctor {
	name: string;
	qualifications: string;
	specialities: string[];
	experienceYears: number;
	languages: string[];
	summary: string;
	bio: string;
	registrationNumber: string;
	featured?: boolean;
	/** Service names this doctor performs. */
	services: string[];
	/** Location index → weekly schedule at that branch. */
	branches: Array<{ location: number; schedule: WeeklyHours }>;
}

export interface Profile {
	clinicType: ClinicType;
	clinic: { name: string; shortName: string; tagline: string; email: string };
	about: string;
	slides: Array<{ heading: string; subheading: string; buttonText: string; buttonLink: string; align: 'left' | 'center' | 'right' }>;
	services: SeedService[];
	doctors: SeedDoctor[];
	intents: Array<{ title: string; description: string; icon: string; links: Array<{ label: string; href: string }> }>;
	process: Array<{ title: string; description: string }>;
	technology: Array<{ title: string; description: string; icon: string }>;
	amenities: Array<{ title: string; icon: string }>;
	testimonials: Array<{ name: string; rating: number; text: string; source: string; date: string }>;
	faqs: Array<{ question: string; answer: string; category?: string }>;
	certifications: Array<{ title: string; issuer: string; year: number; description: string }>;
	insurance: Array<{ title: string; description: string; icon: string }>;
	membership: Array<{ name: string; price: string; period: string; description: string; features: string[]; highlighted?: boolean }>;
}
