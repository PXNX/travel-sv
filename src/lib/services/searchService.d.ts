// src/lib/services/searchService.d.ts
/**
 * Type declarations for search service
 */

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

export type PlaceCategory =
    | 'food'      // Restaurants, cafes, bars
    | 'museum'    // Museums, galleries, cultural sites
    | 'leisure'   // Hotels, entertainment
    | 'nature'    // Parks, gardens, outdoor
    | 'shopping'  // Shops, markets
    | 'attraction'; // Tourist attractions

export interface SearchOptions {
    limit?: number;
    viewbox?: [number, number, number, number];
    bounded?: boolean;
}

export interface PlaceSearchOptions extends SearchOptions {
    category?: PlaceCategory;
    near?: { lat: number; lon: number };
}

/**
 * Search for locations (cities, towns, addresses, regions)
 */
export function searchLocations(
    query: string,
    options?: SearchOptions
): Promise<SearchResult[]>;

/**
 * Search for places/POIs (restaurants, museums, attractions, hotels, etc.)
 */
export function searchPlaces(
    query: string,
    options?: PlaceSearchOptions
): Promise<SearchResult[]>;

/**
 * Reverse geocoding - get location details from coordinates
 */
export function reverseGeocode(
    lat: number,
    lon: number,
    zoom?: number
): Promise<SearchResult | null>;

/**
 * Create a debounced version of a search function
 */
export function createDebouncedSearch<T extends any[]>(
    searchFn: (...args: T) => Promise<SearchResult[]>,
    delay?: number
): (...args: T) => Promise<SearchResult[]>;
