# OSM Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐        ┌──────────────────────────┐   │
│  │  Browse Locations   │        │   Add New Location       │   │
│  │     Page            │        │       Page               │   │
│  │                     │        │                          │   │
│  │  • Map View         │        │  • OSM Search Box        │   │
│  │  • Search Bar       │        │  • Auto-fill Form        │   │
│  │  • Results List     │        │  • Map Picker            │   │
│  │  • City Filter      │        │  • Manual Entry          │   │
│  │  • Category Filter  │        │                          │   │
│  └─────────┬───────────┘        └────────────┬─────────────┘   │
│            │                                  │                  │
└────────────┼──────────────────────────────────┼──────────────────┘
             │                                  │
             │         ┌────────────────────────┘
             │         │
             ▼         ▼
    ┌────────────────────────────┐
    │  SearchAutocomplete        │
    │      Component             │
    │                            │
    │  • Debounced Search        │
    │  • Keyboard Navigation     │
    │  • Results Dropdown        │
    └──────────┬─────────────────┘
               │
               ▼
    ┌────────────────────────────┐
    │   Search Service           │
    │   (searchService.ts)       │
    │                            │
    │  • searchPlaces()          │
    │  • searchLocations()       │
    │  • reverseGeocode()        │
    │  • Rate Limiting           │
    └──────────┬─────────────────┘
               │
               ▼
    ┌────────────────────────────┐
    │  OSM Nominatim API         │
    │                            │
    │  • Place Search            │
    │  • Geocoding               │
    │  • Reverse Geocoding       │
    └──────────┬─────────────────┘
               │
               ▼ (SearchResult)
    ┌────────────────────────────┐
    │    OSM Mapper              │
    │    (osmMapper.ts)          │
    │                            │
    │  • mapSearchResultTo       │
    │    PlaceData()             │
    │  • mapOSMCategoryTo        │
    │    AppCategory()           │
    │  • estimateDuration()      │
    │  • generateDescription()   │
    └──────────┬─────────────────┘
               │
               ▼ (OSMPlaceData)
    ┌────────────────────────────┐
    │   Location Form            │
    │                            │
    │  • Title                   │
    │  • Description             │
    │  • Category                │
    │  • Duration                │
    │  • Coordinates             │
    │  • Address                 │
    └──────────┬─────────────────┘
               │
               ▼
    ┌────────────────────────────┐
    │   Database                 │
    │   (travel_tips table)      │
    └────────────────────────────┘
```

## Data Flow

### Flow 1: Browse & Add Workflow

```
User Action                 System Response
───────────                ────────────────

1. Navigate to              → Load Browse page
   /browse-locations          Show map centered on Berlin

2. Select city filter       → Update map center
   (e.g., "Munich")           Update search coordinates

3. Enter search query       → Call searchService.searchPlaces()
   "museums"                  Rate-limited API call to OSM
                             ↓
                             Return SearchResult[]

4. Select result            → Map OSM data to app format
   from list                  Call osmMapper.mapSearchResultToPlaceData()
                             ↓
                             Show on map with category marker
                             Display details in card

5. Click "Add to            → Navigate to /location/new
   My Locations"              Pass: lat, lng, title as URL params

6. Form auto-fills          → Pre-fill all fields
                             User can edit

7. Click "Add Location"     → Save to database
                             Redirect to location detail
```

### Flow 2: Quick Add from "Add New Location" Page

```
User Action                 System Response
───────────                ────────────────

1. Navigate to              → Load Add Location page
   /location/new              Show OSM search box

2. Type in search box       → Debounced autocomplete
   "Hofbräuhaus"             Call searchService.searchPlaces()
                             ↓
                             Show dropdown with results

3. Select from dropdown     → Call osmMapper.mapSearchResultToPlaceData()
                             Auto-fill form fields
                             Update map marker
                             Show "auto-filled" indicators

4. Edit any fields          → Update form state
   (optional)                 Keep OSM source info

5. Click "Add Location"     → Validate form
                             Save to database
                             Redirect to location detail
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│                       Sidebar                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  "Browse OpenStreetMap Places" Button          │    │
│  │  └─> Links to /browse-locations                │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Browse Locations Page                       │
│  ┌────────────────────────────────────────────────┐    │
│  │  SearchAutocomplete                            │    │
│  │  • Uses searchService                          │    │
│  │  • Returns SearchResult[]                      │    │
│  └────────────┬───────────────────────────────────┘    │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Map with Markers                              │    │
│  │  • Uses osmMapper for category colors          │    │
│  │  • Shows all search results                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Results List                                  │    │
│  │  • Each item: "Add to My Locations" button     │    │
│  │  • Navigates to /location/new with params      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Add New Location Page                       │
│  ┌────────────────────────────────────────────────┐    │
│  │  OSM Search Section                            │    │
│  │  • SearchAutocomplete                          │    │
│  │  • "Place selected" indicator                  │    │
│  └────────────┬───────────────────────────────────┘    │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Form Fields (auto-filled)                     │    │
│  │  • Title                                       │    │
│  │  • Description (with hint)                     │    │
│  │  • Category (with "auto-detected" hint)        │    │
│  │  • Duration (with "estimated" hint)            │    │
│  │  • All editable                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Map Picker                                    │    │
│  │  • Shows marker with category color            │    │
│  │  • Updates on search result select             │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Service Layer Architecture

```
┌───────────────────────────────────────────────────────┐
│               Service Layer                            │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │  searchService.ts                            │   │
│  │  ────────────────────────────────────────    │   │
│  │                                               │   │
│  │  searchPlaces(query, options)                │   │
│  │  ├─> Calls Nominatim API                     │   │
│  │  ├─> Filters for POI types                   │   │
│  │  ├─> Sorts by proximity                      │   │
│  │  └─> Returns SearchResult[]                  │   │
│  │                                               │   │
│  │  searchLocations(query, options)             │   │
│  │  ├─> Calls Nominatim API                     │   │
│  │  ├─> Filters for geographic locations        │   │
│  │  └─> Returns SearchResult[]                  │   │
│  │                                               │   │
│  │  reverseGeocode(lat, lon, zoom)              │   │
│  │  └─> Gets place name from coordinates        │   │
│  │                                               │   │
│  │  Rate Limiting: 1 request per second         │   │
│  │  Country Filter: DE, AT, CH, LI              │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │  osmMapper.ts                                │   │
│  │  ────────────────────────────────────────    │   │
│  │                                               │   │
│  │  mapSearchResultToPlaceData(result)          │   │
│  │  ├─> mapOSMCategoryToAppCategory()           │   │
│  │  ├─> estimateDuration()                      │   │
│  │  ├─> generateDescription()                   │   │
│  │  └─> Returns OSMPlaceData                    │   │
│  │                                               │   │
│  │  Category Mapping Rules (50+ types)          │   │
│  │  ├─> Food: restaurant, cafe, bar...          │   │
│  │  ├─> Museum: museum, gallery, theatre...     │   │
│  │  ├─> Nature: park, garden, beach...          │   │
│  │  └─> Leisure: hotel, attraction, zoo...      │   │
│  │                                               │   │
│  │  Duration Estimation Rules                   │   │
│  │  ├─> Quick: 30 min (cafe, monument)          │   │
│  │  ├─> Short: 60 min (bar, playground)         │   │
│  │  ├─> Medium: 90 min (restaurant, gallery)    │   │
│  │  ├─> Long: 120 min (museum, zoo)             │   │
│  │  └─> Stay: 480 min (hotel)                   │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// From searchService.ts
interface SearchResult {
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

// From osmMapper.ts
interface OSMPlaceData {
  title: string;
  description: string;
  category: Category; // 'food' | 'museum' | 'nature' | 'leisure'
  durationMinutes: number;
  latitude: number;
  longitude: number;
  address: string;
}

// From app's type system
type Category = 'food' | 'museum' | 'nature' | 'leisure';
```

## State Management

```
Browse Page State:
├─ searchResults: SearchResult[]
├─ selectedPlace: SearchResult | null
├─ selectedCategory: Category | 'all'
├─ searchLocation: string
├─ centerCoords: { lat, lon }
└─ mapMarkers: L.Marker[]

Add Location Page State:
├─ titleInput: string
├─ descriptionInput: string
├─ category: Category
├─ durationMinutes: number
├─ latitude: number
├─ longitude: number
├─ addressInput: string
├─ selectedOSMPlace: SearchResult | null
└─ showOSMSearch: boolean
```

## Error Handling

```
API Errors:
├─ Rate Limit Exceeded → Wait & Retry
├─ Network Error → Show error message
├─ No Results → Show "No results found"
└─ Invalid Response → Log & fallback

Data Validation:
├─ Missing coordinates → Use map picker
├─ Invalid category → Default to 'food'
├─ Missing title → Require user input
└─ Zero duration → Default to 60 min

User Input:
├─ Empty search → Clear results
├─ Invalid place → Show error
└─ Duplicate location → Warning (existing check)
```

## Performance Considerations

```
Optimizations:
├─ Debounced search (300ms)
├─ Rate limiting (1 req/sec)
├─ Result caching in component state
├─ Lazy loading of map markers
└─ Minimal re-renders with $state

API Usage:
├─ Max 1 request per second
├─ Results limited to 10-20 items
├─ Country-restricted queries
└─ Respect Nominatim usage policy
```

---

## Architecture Benefits

1. **Separation of Concerns**
   - UI components handle presentation
   - Services handle data fetching
   - Mapper handles transformation

2. **Reusability**
   - SearchAutocomplete used in multiple places
   - osmMapper used across pages
   - searchService shared functionality

3. **Maintainability**
   - Clear data flow
   - Type safety with TypeScript
   - Documented mapping rules

4. **Extensibility**
   - Easy to add new place types
   - Can extend duration rules
   - Simple to add new features

5. **User Experience**
   - Fast autocomplete
   - Visual feedback
   - Error handling
   - Graceful fallbacks
