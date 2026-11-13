import { listSlides, listBlocks, listServices, listDoctors, listLocations, listCertifications, groupByCategory } from '#lib/server/queries.js';
import { SECTION_MODULE, type HomepageSectionId } from '#lib/settings/schema.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const s = locals.settings;
	const db = locals.db;
	const sections = s.homepage.sections.filter((sec) => {
		if (!sec.enabled) return false;
		const mod = SECTION_MODULE[sec.id];
		return mod ? s.modules[mod] : true;
	});
	const on = new Set<HomepageSectionId>(sections.map((x) => x.id));
	const want = <T>(id: HomepageSectionId, fn: () => Promise<T>, empty: T) => (on.has(id) ? fn() : Promise.resolve(empty));

	const [slides, intents, services, process, doctors, locations, certifications, technology, amenities, testimonials, insurance, membership, faqs] =
		await Promise.all([
			want('hero', () => listSlides(db), []),
			want('intents', () => listBlocks<{ title: string; description: string; icon: string; links: Array<{ label: string; href: string }> }>(db, 'intents'), []),
			want('services', () => listServices(db), []),
			want('process', () => listBlocks<{ title: string; description: string }>(db, 'process'), []),
			want(
				'doctors',
				async () => {
					const featured = await listDoctors(db, { featuredOnly: true });
					return (featured.length ? featured : await listDoctors(db)).slice(0, 8);
				},
				[]
			),
			on.has('locations') ? listLocations(db) : Promise.resolve([]),
			want('certifications', () => listCertifications(db), []),
			want('technology', () => listBlocks<{ title: string; description: string; icon: string }>(db, 'technology'), []),
			want('amenities', () => listBlocks<{ title: string; icon: string }>(db, 'amenities'), []),
			want('testimonials', () => listBlocks<{ name: string; rating: number; text: string; source: string; date: string; url: string }>(db, 'testimonials'), []),
			want('insurance', () => listBlocks<{ title: string; description: string; icon: string }>(db, 'insurance'), []),
			want('membership', () => listBlocks<{ name: string; price: string; period: string; description: string; features: string[]; highlighted: boolean; ctaText: string; ctaLink: string }>(db, 'membership'), []),
			want('faq', () => listBlocks<{ question: string; answer: string }>(db, 'faqs'), [])
		]);

	return {
		sections,
		slides,
		intents,
		serviceGroups: groupByCategory(services, s.labels.services),
		process,
		doctors,
		locations,
		certifications,
		technology,
		amenities,
		testimonials,
		insurance,
		membership,
		faqs
	};
};
