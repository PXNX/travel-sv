# Search Feature Documentation

## Overview

The application now features two separate search functionalities using OpenStreetMap Nominatim API, restricted to German-speaking countries (Germany, Austria, Switzerland, Liechtenstein).

## Features

### 1. Location Search
**Purpose**: Search for geographic locations like cities, towns, addresses, and regions.

**Use Cases**:
- Finding cities to plan trips
- Searching for addresses
- Locating regions or administrative areas
- General geographic navigation

**Restricted to**: 
- 🇩🇪 Germany (de)
- 🇦🇹 Austria (at)
- 🇨🇭 Switzerland (ch)
- 🇱🇮 Liechtenstein (li)

### 2. Place Search
**Purpose**: Search for specific Points of Interest (POIs) like restaurants, museums, hotels, parks, etc.

**Supported Place Types**:
- **Food & Dining**: Restaurants, cafes, bars, pubs
- **Museums & Culture**: Museums, galleries, theaters, cinemas
- **Leisure**: Hotels, attractions, theme parks, entertainment
- **Nature**: Parks, gardens, nature reserves, beaches
- **Shopping**: Shops, markets, malls
- **Historic**: Monuments, castles, historic sites

## Implementation

### Core Service: `searchService.ts`

Located at: `src/lib/services/searchService.ts`

#### Key Functions

```typescript
// Search for locations (cities, addresses, etc.)
searchLocations(query: string, options?: {
  limit?: number;
  viewbox?: [number, number, number, number];
  bounded?: boolean;
}): Promise<SearchResult[]>

// Search for places/POIs
searchPlaces(query: string, options?: {
  limit?: number;
  viewbox?: [number, number, number, number];
  bounded?: boolean;
  category?: PlaceCategory;
  near?: { lat: number; lon: number };
}): Promise<SearchResult[]>

// Reverse geocoding (coordinates to location)
reverseGeocode(
  lat: number, 
  lon: number, 
  zoom?: number
): Promise<SearchResult | null>

// Create debounced search for autocomplete
createDebouncedSearch(
  searchFn: Function,
  delay?: number
): Function
```

#### Rate Limiting

The service implements automatic rate limiting to respect Nominatim's usage policy:
- Maximum 1 request per second
- Automatic throttling built into all API calls
- User-Agent header included in all requests

### UI Component: `SearchAutocomplete.svelte`

Located at: `src/lib/components/SearchAutocomplete.svelte`

#### Props

```typescript
interface Props {
  placeholder?: string;           // Input placeholder text
  searchType?: 'location' | 'place'; // Type of search
  category?: PlaceCategory;       // Filter by category (places only)
  limit?: number;                 // Max results (default: 10)
  onselect?: (result: SearchResult) => void; // Selection callback
  onclear?: () => void;           // Clear callback
  autofocus?: boolean;            // Auto-focus input
  compact?: boolean;              // Compact mode
  showClearButton?: boolean;      // Show clear button
  nearCoords?: { lat: number; lon: number }; // Proximity search
}
```

#### Features

- **Fuzzy Autocomplete**: Real-time search as you type with 300ms debounce
- **Keyboard Navigation**: 
  - Arrow Up/Down to navigate results
  - Enter to select
  - Escape to close
- **Visual Feedback**: Loading states, empty states, error states
- **Accessibility**: ARIA labels, roles, and keyboard support
- **OpenStreetMap Attribution**: Proper attribution displayed

#### Usage Example

```svelte
<SearchAutocomplete
  placeholder="Search restaurants..."
  searchType="place"
  category="food"
  limit={10}
  compact={true}
  nearCoords={{ lat: 48.8566, lon: 2.3522 }}
  onselect={(result) => {
    console.log('Selected:', result);
    // Handle selection
  }}
/>
```

## Integration in Main App

### Sidebar Component (`src/lib/components/Sidebar.svelte`)

The sidebar now features:

1. **Toggle Buttons**: Switch between Location and Place search
   ```svelte
   <button onclick={() => (showPlaceSearch = false)}>Locations</button>
   <button onclick={() => (showPlaceSearch = true)}>Places</button>
   ```

2. **Conditional Search Components**:
   - Location search: For cities, addresses, regions
   - Place search: For POIs (restaurants, museums, etc.)

3. **Trip Integration**: 
   - When a trip is active, selecting a search result automatically adds it to the trip
   - When no trip is active, the map zooms to the selected location

### Main Page (`src/routes/(authorized)/+page.svelte`)

The main page handles:
- Search result selection
- Creating temporary locations from search results
- Adding locations to active trips
- Map navigation based on search

## Data Flow

```
User Input
    ↓
SearchAutocomplete Component
    ↓
searchService (with debouncing & rate limiting)
    ↓
Nominatim API (filtered by country codes)
    ↓
Parse & Filter Results
    ↓
Display in Dropdown
    ↓
User Selection
    ↓
Parent Component Handler
    ↓
Action (zoom map, add to trip, etc.)
```

## SearchResult Type

```typescript
interface SearchResult {
  id: string;              // Unique identifier (osm_type-osm_id)
  name: string;            // Short name
  displayName: string;     // Full display name
  latitude: number;        // Latitude coordinate
  longitude: number;       // Longitude coordinate
  type: string;            // OSM type (city, restaurant, etc.)
  category?: string;       // OSM class (tourism, amenity, etc.)
  address?: string;        // Formatted address
  city?: string;           // City name
  state?: string;          // State/region
  country?: string;        // Country name
  countryCode?: string;    // ISO country code
  importance?: number;     // OSM importance score
}
```

## Country Filtering

All searches are restricted to German-speaking countries using the `countrycodes` parameter:

```typescript
const SEARCH_COUNTRIES = ['de', 'at', 'ch', 'li'];
```

This ensures results are only returned from:
- 🇩🇪 Germany
- 🇦🇹 Austria  
- 🇨🇭 Switzerland
- 🇱🇮 Liechtenstein

## Performance Optimizations

1. **Debouncing**: 300ms delay prevents excessive API calls during typing
2. **Rate Limiting**: 1 request per second maximum
3. **Result Limiting**: Configurable limit (default: 10)
4. **Caching**: Browser-level HTTP caching
5. **Proximity Sorting**: Results can be sorted by distance when coordinates provided

## Error Handling

- Network errors are caught and logged
- Empty results show helpful messages
- Invalid searches (< 2 characters) are prevented
- Timeout handling for slow responses

## Accessibility

- ARIA labels and roles for screen readers
- Keyboard navigation support
- Focus management
- Clear visual indicators for selected items
- Proper heading structure

## Best Practices

1. **Respect Nominatim's Usage Policy**:
   - Always include User-Agent header
   - Implement rate limiting
   - Cache results when possible
   - Don't abuse the service

2. **User Experience**:
   - Provide clear feedback during loading
   - Show helpful empty states
   - Enable keyboard navigation
   - Display proper attribution

3. **Performance**:
   - Use debouncing for autocomplete
   - Limit result count
   - Implement proximity-based sorting when relevant

## Future Enhancements

Potential improvements:
- [ ] Local caching layer with IndexedDB
- [ ] Save recent searches
- [ ] Favorite locations
- [ ] Custom POI categories
- [ ] Multi-language support
- [ ] Offline fallback with stored data
- [ ] Advanced filters (opening hours, ratings, etc.)
- [ ] Map bounds-based search

## Testing

To test the search functionality:

1. **Location Search**:
   - Search for "Berlin" → Should return Berlin, Germany
   - Search for "Zürich" → Should return Zürich, Switzerland
   - Search for "Vienna" → Should return Vienna, Austria

2. **Place Search**:
   - Search for "restaurant Berlin" → Should return restaurants in Berlin
   - Search for "museum München" → Should return museums in Munich
   - Search for "hotel Wien" → Should return hotels in Vienna

3. **Country Filtering**:
   - Search for "Paris" → Should return NO results (France not included)
   - Search for "London" → Should return NO results (UK not included)

## Troubleshooting

**No results appearing**:
- Check browser console for errors
- Verify network connection
- Ensure search query is at least 2 characters
- Check if Nominatim API is accessible

**Slow responses**:
- Normal for first request (DNS lookup, SSL handshake)
- Rate limiting may delay subsequent requests
- Consider implementing a loading indicator

**Wrong results**:
- Verify country codes in `SEARCH_COUNTRIES`
- Check search type (location vs place)
- Review category filtering logic

## References

- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OSM Tag Documentation](https://wiki.openstreetmap.org/wiki/Map_features)
