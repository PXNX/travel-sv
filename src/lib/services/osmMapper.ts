// src/lib/services/osmMapper.ts
/**
 * Maps OpenStreetMap place data to our application's categories and formats
 */

import type { Category } from '$lib/types/index';
import type { SearchResult } from './searchService';

export interface OSMPlaceData {
    title: string;
    description: string;
    category: Category;
    durationMinutes: number;
    latitude: number;
    longitude: number;
    address: string;
}

/**
 * Maps OSM place type and class to our app's category
 */
export function mapOSMCategoryToAppCategory(osmType?: string, osmClass?: string): Category {
    if (!osmType && !osmClass) return 'food';

    const type = osmType?.toLowerCase() || '';
    const cls = osmClass?.toLowerCase() || '';

    // Food & Dining
    if (
        type.includes('restaurant') ||
        type.includes('cafe') ||
        type.includes('bar') ||
        type.includes('pub') ||
        type.includes('fast_food') ||
        type.includes('food_court') ||
        type.includes('biergarten') ||
        type.includes('ice_cream') ||
        cls === 'amenity' && (type.includes('restaurant') || type.includes('cafe'))
    ) {
        return 'food';
    }

    // Museums & Culture
    if (
        type.includes('museum') ||
        type.includes('gallery') ||
        type.includes('theatre') ||
        type.includes('cinema') ||
        type.includes('arts_centre') ||
        type.includes('library') ||
        type.includes('planetarium') ||
        cls === 'tourism' && (type.includes('museum') || type.includes('gallery')) ||
        cls === 'amenity' && (type.includes('theatre') || type.includes('library'))
    ) {
        return 'museum';
    }

    // Nature & Outdoors
    if (
        type.includes('park') ||
        type.includes('garden') ||
        type.includes('nature_reserve') ||
        type.includes('beach') ||
        type.includes('water_park') ||
        type.includes('viewpoint') ||
        type.includes('picnic_site') ||
        type.includes('playground') ||
        type.includes('forest') ||
        type.includes('peak') ||
        cls === 'leisure' && (type.includes('park') || type.includes('garden') || type.includes('nature_reserve')) ||
        cls === 'natural'
    ) {
        return 'nature';
    }

    // Leisure (hotels, attractions, entertainment)
    if (
        type.includes('hotel') ||
        type.includes('hostel') ||
        type.includes('guest_house') ||
        type.includes('motel') ||
        type.includes('bed_and_breakfast') ||
        type.includes('attraction') ||
        type.includes('artwork') ||
        type.includes('castle') ||
        type.includes('monument') ||
        type.includes('memorial') ||
        type.includes('zoo') ||
        type.includes('aquarium') ||
        type.includes('theme_park') ||
        type.includes('stadium') ||
        type.includes('sports_centre') ||
        type.includes('swimming_pool') ||
        cls === 'tourism' ||
        cls === 'historic' ||
        cls === 'leisure'
    ) {
        return 'leisure';
    }

    // Default to food if we can't determine
    return 'food';
}

/**
 * Estimates visit duration based on place type
 */
export function estimateDuration(osmType?: string, osmClass?: string): number {
    const type = osmType?.toLowerCase() || '';
    const cls = osmClass?.toLowerCase() || '';

    // Quick visits (30-45 min)
    if (
        type.includes('cafe') ||
        type.includes('fast_food') ||
        type.includes('ice_cream') ||
        type.includes('viewpoint') ||
        type.includes('monument') ||
        type.includes('memorial')
    ) {
        return 30;
    }

    // Short visits (1 hour)
    if (
        type.includes('bar') ||
        type.includes('pub') ||
        type.includes('playground') ||
        type.includes('picnic_site')
    ) {
        return 60;
    }

    // Medium visits (1.5-2 hours)
    if (
        type.includes('restaurant') ||
        type.includes('gallery') ||
        type.includes('castle') ||
        type.includes('garden') ||
        type.includes('beach')
    ) {
        return 90;
    }

    // Long visits (2-3 hours)
    if (
        type.includes('museum') ||
        type.includes('zoo') ||
        type.includes('aquarium') ||
        type.includes('theme_park') ||
        type.includes('park') ||
        type.includes('nature_reserve')
    ) {
        return 120;
    }

    // Hotels/accommodations
    if (
        type.includes('hotel') ||
        type.includes('hostel') ||
        type.includes('guest_house')
    ) {
        return 480; // 8 hours (overnight)
    }

    // Default: 1 hour
    return 60;
}

/**
 * Generates a description based on OSM data
 */
export function generateDescription(result: SearchResult): string {
    const parts: string[] = [];

    // Add type information
    if (result.type) {
        const typeLabel = result.type.replace(/_/g, ' ');
        parts.push(`A ${typeLabel}`);
    }

    // Add location information
    if (result.city) {
        parts.push(`in ${result.city}`);
    } else if (result.state) {
        parts.push(`in ${result.state}`);
    }

    // Add country if not city/state
    if (!result.city && !result.state && result.country) {
        parts.push(`in ${result.country}`);
    }

    let description = parts.join(' ');

    // Capitalize first letter
    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1) + '.';
    } else {
        description = 'A point of interest worth visiting.';
    }

    // Add a suggestion to edit
    description += ' Feel free to add more details about your experience here!';

    return description;
}

/**
 * Maps a SearchResult from OSM to our app's place data format
 */
export function mapSearchResultToPlaceData(result: SearchResult): OSMPlaceData {
    const category = mapOSMCategoryToAppCategory(result.type, result.category);
    const durationMinutes = estimateDuration(result.type, result.category);
    const description = generateDescription(result);

    return {
        title: result.name,
        description,
        category,
        durationMinutes,
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address || result.displayName
    };
}

/**
 * Gets a category filter for OSM search based on our app's category
 */
export function getOSMCategoryFilter(appCategory: Category): 'food' | 'museum' | 'leisure' | 'nature' | undefined {
    // Map our categories to OSM search categories
    const categoryMap: Record<Category, 'food' | 'museum' | 'leisure' | 'nature'> = {
        food: 'food',
        museum: 'museum',
        leisure: 'leisure',
        nature: 'nature'
    };

    return categoryMap[appCategory];
}
