# Search API Reference

Quick reference for developers using the search functionality.

## Import

```typescript
import { 
  searchLocations, 
  searchPlaces, 
  reverseGeocode,
  createDebouncedSearch,
  type SearchResult,
  type PlaceCategory
} from '$lib/services/searchService';

import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
```

## Types

### SearchResult

```typescript
interface SearchResult {
  id: string;              // Unique OSM identifier
  name: string;            // Short name
  displayName: string;     // Full display name with address
  latitude: number;        // Latitude (-90 to 90)
  longitude: number;       // Longitude (-180 to 180)
  type: string;            // OSM type (city, restaurant, etc.)
  category?: string;       // OSM class (tourism, amenity, etc.)
  address?: string;        // Formatted address
  city?: string;           // City name
  state?: string;          // State/region
  country?: string;        // Country name
  countryCode?: string;    // ISO 3166-1 alpha-2 code
  importance?: number;     // OSM importance (0-1)
}
```

### PlaceCategory

```typescript
type PlaceCategory = 
  | 'food'       // Restaurants, cafes, bars
  | 'museum'     // Museums, galleries, culture
  | 'leisure'    // Hotels, entertainment
  | 'nature'     // Parks, gardens, outdoor
  | 'shopping'   // Shops, markets
  | 'attraction' // Tourist attractions
```

## API Functions

### searchLocations()

Search for geographic locations (cities, addresses, regions).

```typescript
async function searchLocations(
  query: string,
  options?: {
    limit?: number;                              // Max results (default: 10)
    viewbox?: [number, number, number, number];  // [minLon, minLat, maxLon, maxLat]
    bounded?: boolean;                           // Restrict to viewbox (default: false)
  }
): Promise<SearchResult[]>
```

**Examples:**

```typescript
// Simple search
const results = await searchLocations('Berlin');

// With limit
const results = await searchLocations('Munich', { limit: 5 });

// With viewbox (Bavaria region)
const results = await searchLocations('Munich', {
  viewbox: [10.8, 47.2, 13.8, 49.0],
  bounded: true
});
```

### searchPlaces()

Search for points of interest (restaurants, museums, etc.).

```typescript
async function searchPlaces(
  query: string,
  options?: {
    limit?: number;                              // Max results (default: 10)
    viewbox?: [number, number, number, number];  // [minLon, minLat, maxLon, maxLat]
    bounded?: boolean;                           // Restrict to viewbox
    category?: PlaceCategory;                    // Filter by category
    near?: { lat: number; lon: number };         // Proximity-based sorting
  }
): Promise<SearchResult[]>
```

**Examples:**

```typescript
// Simple place search
const results = await searchPlaces('restaurant');

// With category filter
const results = await searchPlaces('museum', { 
  category: 'museum' 
});

// With proximity sorting
const results = await searchPlaces('hotel', {
  near: { lat: 48.1351, lon: 11.5820 },  // Munich
  limit: 10
});

// Combined filters
const results = await searchPlaces('restaurant', {
  category: 'food',
  near: { lat: 52.5200, lon: 13.4050 },  // Berlin
  limit: 20
});
```

### reverseGeocode()

Convert coordinates to location information.

```typescript
async function reverseGeocode(
  lat: number,      // Latitude
  lon: number,      // Longitude
  zoom?: number     // Detail level: 3=country, 10=city, 18=building (default: 18)
): Promise<SearchResult | null>
```

**Examples:**

```typescript
// Get detailed location
const result = await reverseGeocode(52.5200, 13.4050);

// Get city-level info
const result = await reverseGeocode(52.5200, 13.4050, 10);

// Get country-level info
const result = await reverseGeocode(52.5200, 13.4050, 3);
```

### createDebouncedSearch()

Create a debounced version of a search function for autocomplete.

```typescript
function createDebouncedSearch<T extends any[]>(
  searchFn: (...args: T) => Promise<SearchResult[]>,
  delay?: number  // Delay in ms (default: 300)
): (...args: T) => Promise<SearchResult[]>
```

**Example:**

```typescript
const debouncedSearch = createDebouncedSearch(searchLocations, 500);

// Now calls will be debounced with 500ms delay
const results = await debouncedSearch('Berlin');
```

## Component: SearchAutocomplete

### Props

```typescript
interface Props {
  placeholder?: string;                    // Input placeholder
  searchType?: 'location' | 'place';      // Search type
  category?: PlaceCategory;                // Filter category
  limit?: number;                          // Max results
  onselect?: (result: SearchResult) => void;  // Selection callback
  onclear?: () => void;                    // Clear callback
  autofocus?: boolean;                     // Auto-focus input
  compact?: boolean;                       // Compact styling
  showClearButton?: boolean;               // Show clear button
  nearCoords?: { lat: number; lon: number }; // Proximity search
}
```

### Usage Examples

**Basic Location Search:**

```svelte
<SearchAutocomplete
  searchType="location"
  placeholder="Search cities..."
  onselect={(result) => {
    console.log('Selected:', result);
  }}
/>
```

**Place Search with Category:**

```svelte
<SearchAutocomplete
  searchType="place"
  category="food"
  placeholder="Find restaurants..."
  limit={15}
  onselect={(result) => {
    handleRestaurantSelect(result);
  }}
/>
```

**Proximity-Based Place Search:**

```svelte
<script>
  const userLocation = { lat: 48.1351, lon: 11.5820 };
</script>

<SearchAutocomplete
  searchType="place"
  category="museum"
  nearCoords={userLocation}
  placeholder="Museums near you..."
  onselect={(result) => {
    navigateToMuseum(result);
  }}
/>
```

**Compact Mode:**

```svelte
<SearchAutocomplete
  searchType="location"
  compact={true}
  limit={5}
  onselect={handleSelect}
/>
```

**With Clear Callback:**

```svelte
<SearchAutocomplete
  searchType="place"
  onselect={(result) => {
    selectedPlace = result;
  }}
  onclear={() => {
    selectedPlace = null;
  }}
  showClearButton={true}
/>
```

## Keyboard Shortcuts

When search results are open:

| Key | Action |
|-----|--------|
| `↓` | Navigate down |
| `↑` | Navigate up |
| `Enter` | Select highlighted result |
| `Escape` | Close results |

## Best Practices

### 1. Debounce User Input

```typescript
const debouncedLocationSearch = createDebouncedSearch(searchLocations, 300);

// Use in your component
let query = $state('');

$effect(() => {
  if (query.length >= 2) {
    results = await debouncedLocationSearch(query);
  }
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  const results = await searchLocations(query);
  if (results.length === 0) {
    showMessage('No results found');
  }
} catch (error) {
  console.error('Search error:', error);
  showMessage('Search failed. Please try again.');
}
```

### 3. Show Loading States

```typescript
let isSearching = $state(false);

async function performSearch(query: string) {
  isSearching = true;
  try {
    return await searchLocations(query);
  } finally {
    isSearching = false;
  }
}
```

### 4. Limit Result Count

```typescript
// For dropdowns, keep it manageable
const results = await searchLocations(query, { limit: 10 });

// For full pages, you can show more
const results = await searchLocations(query, { limit: 50 });
```

### 5. Use Proximity for Better Results

```typescript
// If you have user's location
const userLocation = { lat: 48.1351, lon: 11.5820 };

const nearbyPlaces = await searchPlaces('restaurant', {
  near: userLocation,
  limit: 20
});
```

## Common Patterns

### Autocomplete Search

```svelte
<script>
  import { searchLocations, createDebouncedSearch } from '$lib/services/searchService';
  
  let query = $state('');
  let results = $state([]);
  let isSearching = $state(false);
  
  const debouncedSearch = createDebouncedSearch(searchLocations, 300);
  
  $effect(() => {
    if (query.length >= 2) {
      performSearch();
    } else {
      results = [];
    }
  });
  
  async function performSearch() {
    isSearching = true;
    try {
      results = await debouncedSearch(query);
    } catch (error) {
      console.error(error);
      results = [];
    } finally {
      isSearching = false;
    }
  }
</script>

<input bind:value={query} placeholder="Search..." />
{#if isSearching}
  <span>Searching...</span>
{:else if results.length > 0}
  <ul>
    {#each results as result}
      <li>{result.name}</li>
    {/each}
  </ul>
{/if}
```

### Map Integration

```svelte
<script>
  import { searchLocations } from '$lib/services/searchService';
  import type { SearchResult } from '$lib/services/searchService';
  
  let map: L.Map;
  
  async function handleSearch(query: string) {
    const results = await searchLocations(query, { limit: 1 });
    if (results.length > 0) {
      zoomToLocation(results[0]);
    }
  }
  
  function zoomToLocation(location: SearchResult) {
    map.setView([location.latitude, location.longitude], 13);
    L.marker([location.latitude, location.longitude])
      .addTo(map)
      .bindPopup(location.name)
      .openPopup();
  }
</script>
```

### Category Filtering

```svelte
<script>
  import { searchPlaces, type PlaceCategory } from '$lib/services/searchService';
  
  let category = $state<PlaceCategory>('food');
  let query = $state('');
  let results = $state([]);
  
  async function search() {
    if (query.length >= 2) {
      results = await searchPlaces(query, { 
        category,
        limit: 20 
      });
    }
  }
</script>

<select bind:value={category}>
  <option value="food">Restaurants</option>
  <option value="museum">Museums</option>
  <option value="nature">Parks</option>
</select>

<input bind:value={query} onkeyup={search} />
```

## Rate Limiting

The service automatically handles rate limiting:

- Maximum 1 request per second
- Automatic throttling built-in
- No additional configuration needed

```typescript
// These will be automatically throttled
await searchLocations('Berlin');
await searchLocations('Munich');  // Will wait ~1 second
await searchLocations('Vienna');  // Will wait ~1 second
```

## Error Handling

Possible error scenarios:

```typescript
try {
  const results = await searchLocations(query);
} catch (error) {
  if (error.message.includes('API error')) {
    // Nominatim API error (503, 429, etc.)
    console.error('API temporarily unavailable');
  } else if (error.message.includes('Network')) {
    // Network connectivity issue
    console.error('Check your internet connection');
  } else {
    // Other errors
    console.error('Unexpected error:', error);
  }
}
```

## Testing

Example test cases:

```typescript
import { describe, it, expect } from 'vitest';
import { searchLocations } from '$lib/services/searchService';

describe('Search functionality', () => {
  it('should find Berlin', async () => {
    const results = await searchLocations('Berlin');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Berlin');
  });
  
  it('should respect country filter', async () => {
    const results = await searchLocations('Paris');
    // Paris, France should not be in results
    expect(results.every(r => r.countryCode !== 'fr')).toBe(true);
  });
});
```

## Troubleshooting

### No Results

```typescript
// ❌ Query too short
await searchLocations('B');  // Returns []

// ✅ Query length >= 2
await searchLocations('Berlin');  // Returns results
```

### Wrong Country Results

```typescript
// Verify country codes
const results = await searchLocations('London');
console.log(results.map(r => r.countryCode)); 
// Should only show ['de', 'at', 'ch', 'li']
```

### Slow Response

```typescript
// First request may be slower (DNS, SSL)
// Subsequent requests should be faster due to rate limiting

// If consistently slow, check:
// 1. Network connection
// 2. Nominatim API status
// 3. Query complexity
```

## Related Documentation

- [Search Feature Guide](./SEARCH_FEATURE.md)
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Search/)
