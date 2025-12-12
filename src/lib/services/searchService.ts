// src/lib/services/searchService.ts
/**
 * OSM Nominatim Search Service
 * Provides two separate search functionalities:
 * 1. Location search (cities, regions, addresses)
 * 2. Places search (POIs like restaurants, museums, etc.)
 * 
 * Restricted to German-speaking countries: Germany, Austria, Switzerland, Liechtenstein
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const SEARCH_COUNTRIES = ['de', 'at', 'ch', 'li']; // Germany, Austria, Switzerland, Liechtenstein

// Rate limiting to respect Nominatim's usage policy (max 1 request per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
}

export interface NominatimResult {
    place_id: number;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        road?: string;
        house_number?: string;
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        country_code?: string;
    };
    boundingbox?: string[];
    type?: string;
    importance?: number;
    class?: string;
}

export interface SearchResult {
    id: string;
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    type: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    importance?: number;
}

/**
 * Search for locations (cities, towns, addresses, regions)
 * This is for general geographic locations, not specific places/POIs
 */
export async function searchLocations(
    query: string,
    options: {
        limit?: number;
        viewbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
        bounded?: boolean;
    } = {}
): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const { limit = 10, viewbox, bounded = false } = options;

    await throttleRequest();

    try {
        const params = new URLSearchParams({
            format: 'json',
            q: query.trim(),
            addressdetails: '1',
            limit: limit.toString(),
            countrycodes: SEARCH_COUNTRIES.join(','),
            // Exclude POIs, only include administrative/geographic locations
            'featuretype': 'settlement',
        });

        if (viewbox) {
            params.append('viewbox', viewbox.join(','));
            if (bounded) {
                params.append('bounded', '1');
            }
        }

        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
            headers: {
                'User-Agent': 'TravelPlannerApp/1.0' // Nominatim requires a User-Agent
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const results: NominatimResult[] = await response.json();

        return results
            .filter(result => {
                // Filter for location types (cities, towns, villages, addresses)
                const validTypes = [
                    'city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood',
                    'administrative', 'state', 'region', 'county', 'municipality',
                    'house', 'residential', 'postcode'
                ];
                return result.type && validTypes.includes(result.type);
            })
            .map(result => parseNominatimResult(result));
    } catch (error) {
        console.error('Location search error:', error);
        return [];
    }
}

/**
 * Search for places/POIs (restaurants, museums, attractions, hotels, etc.)
 * This is for specific points of interest, not general geographic locations
 */
export async function searchPlaces(
    query: string,
    options: {
        limit?: number;
        viewbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
        bounded?: boolean;
        category?: PlaceCategory;
        near?: { lat: number; lon: number }; // For proximity-based search
    } = {}
): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const { limit = 10, viewbox, bounded = false, category, near } = options;

    await throttleRequest();

    try {
        const params = new URLSearchParams({
            format: 'json',
            q: query.trim(),
            addressdetails: '1',
            limit: limit.toString(),
            countrycodes: SEARCH_COUNTRIES.join(','),
        });

        // Add category-specific filters if provided
        if (category) {
            const categoryTags = getCategoryTags(category);
            if (categoryTags) {
                params.append('q', `${query.trim()} ${categoryTags}`);
            }
        }

        if (viewbox) {
            params.append('viewbox', viewbox.join(','));
            if (bounded) {
                params.append('bounded', '1');
            }
        }

        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
            headers: {
                'User-Agent': 'TravelPlannerApp/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const results: NominatimResult[] = await response.json();

        let filteredResults = results.filter(result => {
            // Filter for POI/place types
            const poiTypes = [
                'restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court',
                'museum', 'gallery', 'theatre', 'cinema', 'arts_centre',
                'hotel', 'hostel', 'guest_house', 'motel', 'bed_and_breakfast',
                'attraction', 'viewpoint', 'artwork', 'castle', 'monument',
                'park', 'garden', 'nature_reserve', 'beach', 'water_park',
                'stadium', 'sports_centre', 'swimming_pool', 'playground',
                'zoo', 'aquarium', 'theme_park', 'shopping', 'marketplace'
            ];

            const poiClasses = ['tourism', 'amenity', 'leisure', 'shop', 'historic'];

            return (result.type && poiTypes.includes(result.type)) ||
                (result.class && poiClasses.includes(result.class));
        });

        // Sort by importance and proximity if near coordinates provided
        if (near) {
            filteredResults = filteredResults.sort((a, b) => {
                const distA = calculateDistance(near.lat, near.lon, parseFloat(a.lat), parseFloat(a.lon));
                const distB = calculateDistance(near.lat, near.lon, parseFloat(b.lat), parseFloat(b.lon));

                // Weight by importance and distance
                const scoreA = (a.importance || 0) * 0.7 - (distA / 100) * 0.3;
                const scoreB = (b.importance || 0) * 0.7 - (distB / 100) * 0.3;

                return scoreB - scoreA;
            });
        }

        return filteredResults.map(result => parseNominatimResult(result));
    } catch (error) {
        console.error('Place search error:', error);
        return [];
    }
}

/**
 * Reverse geocoding - get location details from coordinates
 */
export async function reverseGeocode(
    lat: number,
    lon: number,
    zoom: number = 18 // Detail level: 3=country, 10=city, 18=building
): Promise<SearchResult | null> {
    await throttleRequest();

    try {
        const params = new URLSearchParams({
            format: 'json',
            lat: lat.toString(),
            lon: lon.toString(),
            zoom: zoom.toString(),
            addressdetails: '1',
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
            headers: {
                'User-Agent': 'TravelPlannerApp/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const result: NominatimResult = await response.json();

        // Verify result is in allowed countries
        if (result.address?.country_code &&
            !SEARCH_COUNTRIES.includes(result.address.country_code)) {
            return null;
        }

        return parseNominatimResult(result);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Parse Nominatim result into our SearchResult format
 */
function parseNominatimResult(result: NominatimResult): SearchResult {
    const city = result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        '';

    const address = [
        result.address?.road,
        result.address?.house_number,
        result.address?.postcode,
        city
    ].filter(Boolean).join(' ');

    return {
        id: `${result.osm_type}-${result.osm_id}`,
        name: result.display_name.split(',')[0].trim(),
        displayName: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        type: result.type || 'unknown',
        category: result.class,
        address: address || result.display_name,
        city,
        state: result.address?.state,
        country: result.address?.country,
        countryCode: result.address?.country_code,
        importance: result.importance,
    };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// Place categories for filtering
export type PlaceCategory =
    | 'food'      // Restaurants, cafes, bars
    | 'museum'    // Museums, galleries, cultural sites
    | 'leisure'   // Hotels, entertainment
    | 'nature'    // Parks, gardens, outdoor
    | 'shopping'  // Shops, markets
    | 'attraction'; // Tourist attractions

/**
 * Get search tags for specific categories
 */
function getCategoryTags(category: PlaceCategory): string {
    const categoryMap: Record<PlaceCategory, string> = {
        food: 'restaurant cafe bar pub',
        museum: 'museum gallery arts',
        leisure: 'hotel entertainment cinema theatre',
        nature: 'park garden nature reserve',
        shopping: 'shop shopping mall market',
        attraction: 'attraction monument castle viewpoint'
    };

    return categoryMap[category] || '';
}

/**
 * Debounced search function for autocomplete
 * Returns a function that delays execution until after a specified wait time
 */
export function createDebouncedSearch<T extends any[]>(
    searchFn: (...args: T) => Promise<SearchResult[]>,
    delay: number = 300
): (...args: T) => Promise<SearchResult[]> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return async (...args: T): Promise<SearchResult[]> => {
        return new Promise((resolve) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(async () => {
                const results = await searchFn(...args);
                resolve(results);
            }, delay);
        });
    };
}
