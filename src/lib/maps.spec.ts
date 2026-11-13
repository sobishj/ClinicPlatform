import { describe, it, expect } from 'vitest';
import { parseMapInput, isAllowedEmbedUrl, coordsFromUrl } from './maps.js';

describe('parseMapInput', () => {
	it('extracts the src from "Embed a map" iframe code', () => {
		const code =
			'<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.3!2d76.3419!3d10.0159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sDemo%20Clinic!5e0!3m2!1sen!2sin!4v1" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
		const r = parseMapInput(code);
		expect(r.error).toBeUndefined();
		expect(r.embedUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/embed\?pb=/);
		expect(r.latitude).toBeCloseTo(10.0159);
		expect(r.longitude).toBeCloseTo(76.3419);
		expect(r.directionsUrl).toContain('destination=10.0159,76.3419');
	});

	it('decodes HTML entities in iframe code', () => {
		const r = parseMapInput('<iframe src="https://www.google.com/maps/embed?pb=!1m2!2d1.5!3d2.5&amp;x=1"></iframe>');
		expect(r.embedUrl).toBe('https://www.google.com/maps/embed?pb=!1m2!2d1.5!3d2.5&x=1');
	});

	it('rejects iframes from other sites', () => {
		const r = parseMapInput('<iframe src="https://evil.example.com/maps/embed?pb=1"></iframe>');
		expect(r.error).toBeDefined();
		expect(r.embedUrl).toBeUndefined();
	});

	it('rejects javascript: and non-https URLs', () => {
		expect(parseMapInput('javascript:alert(1)').error).toBeDefined();
		expect(parseMapInput('http://www.google.com/maps/@10,76,15z').error).toBeDefined();
	});

	it('parses a place link, preferring the exact pin over the viewport', () => {
		const r = parseMapInput(
			'https://www.google.com/maps/place/Demo+Clinic/@10.0150,76.3400,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.0159!4d76.3419!16s'
		);
		expect(r.latitude).toBe(10.0159);
		expect(r.longitude).toBe(76.3419);
		expect(isAllowedEmbedUrl(r.embedUrl)).toBe(true);
	});

	it('parses a viewport-only link', () => {
		const r = parseMapInput('https://www.google.com/maps/@9.9658,76.3189,15z');
		expect(r.latitude).toBe(9.9658);
		expect(r.longitude).toBe(76.3189);
	});

	it('parses ?q=lat,lng links and maps.google.com', () => {
		expect(parseMapInput('https://maps.google.com/?q=10.02,76.30').latitude).toBe(10.02);
		expect(parseMapInput('https://www.google.com/maps/search/?api=1&query=10.02%2C76.30').longitude).toBe(76.3);
	});

	it('falls back to a query embed for place links without coordinates', () => {
		const r = parseMapInput('https://www.google.com/maps/place/Some+Dental+Clinic,+Kochi');
		expect(r.embedUrl).toContain('output=embed');
		expect(isAllowedEmbedUrl(r.embedUrl)).toBe(true);
	});

	it('flags short share links for server-side resolution', () => {
		expect(parseMapInput('https://maps.app.goo.gl/AbCdEf123').needsResolve).toBe(true);
		expect(parseMapInput('https://goo.gl/maps/AbCdEf123').needsResolve).toBe(true);
	});

	it('accepts plain coordinates', () => {
		const r = parseMapInput(' 10.0261, 76.3083 ');
		expect(r.latitude).toBe(10.0261);
		expect(r.embedUrl).toContain('q=10.0261,76.3083');
		expect(parseMapInput('95, 200').error).toBeDefined();
	});

	it('rejects non-Google links and garbage', () => {
		expect(parseMapInput('https://www.openstreetmap.org/#map=15/10/76').error).toBeDefined();
		expect(parseMapInput('hello world').error).toBeDefined();
		expect(parseMapInput('').error).toBeDefined();
	});
});

describe('isAllowedEmbedUrl', () => {
	it('allows only Google Maps embed URLs', () => {
		expect(isAllowedEmbedUrl('https://www.google.com/maps/embed?pb=!1m18')).toBe(true);
		expect(isAllowedEmbedUrl('https://www.google.com/maps?q=10,76&z=16&output=embed')).toBe(true);
		expect(isAllowedEmbedUrl('https://www.google.com/maps?q=10,76')).toBe(false);
		expect(isAllowedEmbedUrl('https://www.google.com.evil.com/maps/embed?pb=1')).toBe(false);
		expect(isAllowedEmbedUrl('https://evil.com/maps/embed?pb=1')).toBe(false);
		expect(isAllowedEmbedUrl('javascript:alert(1)')).toBe(false);
		expect(isAllowedEmbedUrl(null)).toBe(false);
	});
});

describe('coordsFromUrl', () => {
	it('reads lng/lat from embed pb parameters', () => {
		expect(coordsFromUrl('https://www.google.com/maps/embed?pb=!1m3!1d100!2d76.5!3d9.5')).toEqual({ lat: 9.5, lng: 76.5 });
	});
});
