// src/lib/services/searchService.test.ts
/**
 * Test suite for search service
 * Note: These are integration tests that make real API calls
 * Run sparingly to respect Nominatim usage policy
 */

import { describe, it, expect } from 'vitest';
import {
    searchLocations,
    searchPlaces,
    reverseGeocode,
    createDebouncedSearch,
    type SearchResult
} from './searchService';

describe('searchService', () => {
    describe('searchLocations', () => {
        it('should find Berlin, Germany', async () => {
            const results = await searchLocations('Berlin', { limit: 5 });

            expect(results.length).toBeGreaterThan(0);
            const berlin = results[0];
            expect(berlin.name.toLowerCase()).toContain('berlin');
            expect(berlin.countryCode).toBe('de');
            expect(berlin.latitude).toBeCloseTo(52.52, 1);
            expect(berlin.longitude).toBeCloseTo(13.40, 1);
        }, 10000);

        it('should find Vienna, Austria', async () => {
            const results = await searchLocations('Vienna', { limit: 5 });

            expect(results.length).toBeGreaterThan(0);
            const vienna = results.find(r => r.name.toLowerCase().includes('wien') || r.name.toLowerCase().includes('vienna'));
            expect(vienna).toBeDefined();
            expect(vienna?.countryCode).toBe('at');
        }, 10000);

        it('should find Zürich, Switzerland', async () => {
            const results = await searchLocations('Zürich', { limit: 5 });

            expect(results.length).toBeGreaterThan(0);
            const zurich = results[0];
            expect(zurich.name.toLowerCase()).toContain('zürich');
            expect(zurich.countryCode).toBe('ch');
        }, 10000);

        it('should NOT find Paris (France excluded)', async () => {
            const results = await searchLocations('Paris', { limit: 10 });

            // Should not find Paris, France since we filter by German-speaking countries
            const parisResults = results.filter(r =>
                r.name.toLowerCase().includes('paris') && r.country?.toLowerCase().includes('france')
            );
            expect(parisResults.length).toBe(0);
        }, 10000);

        it('should return empty array for short query', async () => {
            const results = await searchLocations('a', { limit: 5 });
            expect(results).toEqual([]);
        }, 5000);

        it('should respect limit parameter', async () => {
            const results = await searchLocations('Berlin', { limit: 3 });
            expect(results.length).toBeLessThanOrEqual(3);
        }, 10000);
    });

    describe('searchPlaces', () => {
        it('should find restaurants in Berlin', async () => {
            const results = await searchPlaces('restaurant Berlin', {
                limit: 5,
                category: 'food'
            });

            expect(results.length).toBeGreaterThan(0);
            // Results should be in German-speaking countries
            results.forEach(result => {
                expect(['de', 'at', 'ch', 'li']).toContain(result.countryCode);
            });
        }, 10000);

        it('should find museums in Munich', async () => {
            const results = await searchPlaces('museum München', {
                limit: 5,
                category: 'museum'
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].countryCode).toBe('de');
        }, 10000);

        it('should find parks with proximity sorting', async () => {
            // Search near Munich
            const munich = { lat: 48.1351, lon: 11.5820 };
            const results = await searchPlaces('park', {
                limit: 5,
                category: 'nature',
                near: munich
            });

            expect(results.length).toBeGreaterThan(0);
        }, 10000);

        it('should return empty array for short query', async () => {
            const results = await searchPlaces('x', { limit: 5 });
            expect(results).toEqual([]);
        }, 5000);
    });

    describe('reverseGeocode', () => {
        it('should reverse geocode Berlin coordinates', async () => {
            const result = await reverseGeocode(52.5200, 13.4050, 10);

            expect(result).toBeDefined();
            expect(result?.countryCode).toBe('de');
            expect(result?.name.toLowerCase()).toContain('berlin');
        }, 10000);

        it('should reverse geocode Vienna coordinates', async () => {
            const result = await reverseGeocode(48.2082, 16.3738, 10);

            expect(result).toBeDefined();
            expect(result?.countryCode).toBe('at');
        }, 10000);

        it('should return null for coordinates outside allowed countries', async () => {
            // Paris coordinates
            const result = await reverseGeocode(48.8566, 2.3522, 10);

            // Should return null since France is not in allowed countries
            expect(result).toBeNull();
        }, 10000);
    });

    describe('createDebouncedSearch', () => {
        it('should debounce function calls', async () => {
            let callCount = 0;
            const mockSearch = async (query: string) => {
                callCount++;
                return [];
            };

            const debouncedSearch = createDebouncedSearch(mockSearch, 100);

            // Call multiple times rapidly
            debouncedSearch('test1');
            debouncedSearch('test2');
            debouncedSearch('test3');

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should only have been called once (last call)
            expect(callCount).toBe(1);
        });
    });

    describe('SearchResult format', () => {
        it('should return properly formatted results', async () => {
            const results = await searchLocations('Berlin', { limit: 1 });

            expect(results.length).toBeGreaterThan(0);
            const result = results[0];

            // Check all required fields
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('displayName');
            expect(result).toHaveProperty('latitude');
            expect(result).toHaveProperty('longitude');
            expect(result).toHaveProperty('type');

            // Check types
            expect(typeof result.id).toBe('string');
            expect(typeof result.name).toBe('string');
            expect(typeof result.displayName).toBe('string');
            expect(typeof result.latitude).toBe('number');
            expect(typeof result.longitude).toBe('number');
            expect(typeof result.type).toBe('string');
        }, 10000);
    });
});

describe('Rate Limiting', () => {
    it('should throttle requests to respect 1 request/second', async () => {
        const startTime = Date.now();

        // Make 3 requests
        await searchLocations('Berlin', { limit: 1 });
        await searchLocations('Munich', { limit: 1 });
        await searchLocations('Vienna', { limit: 1 });

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should take at least 2 seconds (3 requests - 1)
        expect(duration).toBeGreaterThanOrEqual(2000);
    }, 15000);
});
