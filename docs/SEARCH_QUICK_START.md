# Search Feature - Quick Start Guide

Get up and running with the dual search functionality in 5 minutes!

## 🚀 Quick Start

### 1. Basic Usage - Location Search

Search for cities, addresses, and geographic locations:

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  
  let selectedLocation = $state(null);
</script>

<SearchAutocomplete
  searchType="location"
  placeholder="Search for a city..."
  onselect={(result) => {
    selectedLocation = result;
    console.log('Selected:', result.name);
  }}
/>

{#if selectedLocation}
  <p>You selected: {selectedLocation.name}</p>
  <p>Coordinates: {selectedLocation.latitude}, {selectedLocation.longitude}</p>
{/if}
```

### 2. Basic Usage - Place Search

Search for restaurants, museums, and other POIs:

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  
  let selectedPlace = $state(null);
</script>

<SearchAutocomplete
  searchType="place"
  category="food"
  placeholder="Find restaurants..."
  onselect={(result) => {
    selectedPlace = result;
    console.log('Selected restaurant:', result.name);
  }}
/>

{#if selectedPlace}
  <p>Restaurant: {selectedPlace.name}</p>
  <p>Address: {selectedPlace.address}</p>
{/if}
```

## 📝 Common Scenarios

### Scenario 1: Add Location to Map

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  import L from 'leaflet';
  
  let map: L.Map;
  
  function addLocationToMap(result) {
    // Zoom to location
    map.setView([result.latitude, result.longitude], 13);
    
    // Add marker
    L.marker([result.latitude, result.longitude])
      .addTo(map)
      .bindPopup(result.name)
      .openPopup();
  }
</script>

<SearchAutocomplete
  searchType="location"
  onselect={addLocationToMap}
/>
```

### Scenario 2: Find Nearby Places

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  
  // User's current location (Munich)
  const userLocation = { lat: 48.1351, lon: 11.5820 };
</script>

<h3>Find restaurants near you</h3>
<SearchAutocomplete
  searchType="place"
  category="food"
  nearCoords={userLocation}
  placeholder="Search restaurants..."
  onselect={(result) => {
    console.log('Found:', result.name);
    console.log('Distance:', calculateDistance(userLocation, result));
  }}
/>
```

### Scenario 3: Add to Trip Planner

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  
  let tripLocations = $state([]);
  
  function addToTrip(result) {
    tripLocations = [...tripLocations, {
      id: Date.now(),
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address
    }];
  }
</script>

<SearchAutocomplete
  searchType="place"
  onselect={addToTrip}
/>

<ul>
  {#each tripLocations as location}
    <li>{location.name}</li>
  {/each}
</ul>
```

### Scenario 4: Toggle Between Search Types

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
  
  let searchType = $state('location');
</script>

<div class="flex gap-2 mb-4">
  <button 
    class:active={searchType === 'location'}
    onclick={() => searchType = 'location'}
  >
    Locations
  </button>
  <button 
    class:active={searchType === 'place'}
    onclick={() => searchType = 'place'}
  >
    Places
  </button>
</div>

{#if searchType === 'location'}
  <SearchAutocomplete
    searchType="location"
    placeholder="Search cities, addresses..."
    onselect={handleLocationSelect}
  />
{:else}
  <SearchAutocomplete
    searchType="place"
    placeholder="Search restaurants, museums..."
    onselect={handlePlaceSelect}
  />
{/if}
```

## 🎯 Programmatic Search

Use the service directly without the UI component:

```typescript
import { searchLocations, searchPlaces } from '$lib/services/searchService';

// Search for locations
const cities = await searchLocations('Berlin', { limit: 5 });
console.log(cities[0]); 
// {
//   name: 'Berlin',
//   latitude: 52.5200,
//   longitude: 13.4050,
//   ...
// }

// Search for places
const restaurants = await searchPlaces('restaurant', {
  category: 'food',
  near: { lat: 48.1351, lon: 11.5820 },
  limit: 10
});
console.log(restaurants[0]);
// {
//   name: 'Restaurant Name',
//   type: 'restaurant',
//   address: '...',
//   ...
// }
```

## 🔍 Search Examples

### Location Search Examples

Try these searches:

```
✅ "Berlin" → Berlin, Germany
✅ "München" → Munich, Germany  
✅ "Wien" → Vienna, Austria
✅ "Zürich" → Zurich, Switzerland
✅ "Schwarzwald" → Black Forest region
✅ "Marienplatz 1, München" → Specific address
✅ "Bayern" → Bavaria state

❌ "Paris" → No results (France not included)
❌ "London" → No results (UK not included)
```

### Place Search Examples

Try these searches by category:

**Food:**
```
"Hofbräuhaus München" → Famous beer hall
"Café Central Wien" → Historic cafe
"restaurant Berlin" → Restaurants in Berlin
```

**Museums:**
```
"Deutsches Museum" → Munich's science museum
"Pergamonmuseum" → Berlin's Pergamon Museum
"Kunsthistorisches Museum" → Vienna's art museum
```

**Nature:**
```
"Englischer Garten" → Munich's English Garden
"Tiergarten Berlin" → Berlin's Tiergarten park
"Prater Wien" → Vienna's Prater park
```

**Attractions:**
```
"Neuschwanstein" → Famous castle
"Brandenburger Tor" → Brandenburg Gate
"Schloss Schönbrunn" → Schönbrunn Palace
```

## ⚡ Pro Tips

### 1. Minimum Query Length
Searches require at least 2 characters:
```svelte
<!-- ❌ Won't search -->
<SearchAutocomplete onselect={...} />
<!-- User types "B" - no results -->

<!-- ✅ Will search -->
<!-- User types "Be" - shows results -->
```

### 2. Debouncing
Results appear after 300ms of inactivity to reduce API calls:
```
User types: "B" → wait 300ms → no search yet
User types: "e" → wait 300ms → no search yet
User types: "r" → wait 300ms → no search yet
User types: "l" → wait 300ms → SEARCH triggered!
```

### 3. Keyboard Navigation
Navigate results without touching the mouse:
- `↓` Down arrow - next result
- `↑` Up arrow - previous result
- `Enter` - select highlighted result
- `Escape` - close results

### 4. Compact Mode
Use compact mode for tight spaces:
```svelte
<SearchAutocomplete
  compact={true}
  searchType="location"
  onselect={handleSelect}
/>
```

### 5. Category Filtering
Filter place searches by category:
```svelte
<select bind:value={category}>
  <option value="food">Restaurants</option>
  <option value="museum">Museums</option>
  <option value="nature">Parks</option>
  <option value="leisure">Hotels</option>
</select>

<SearchAutocomplete
  searchType="place"
  category={category}
  onselect={handleSelect}
/>
```

## 🎨 Styling

The component uses DaisyUI classes and adapts to your theme:

```svelte
<!-- Default styling -->
<SearchAutocomplete />

<!-- Compact for mobile -->
<SearchAutocomplete compact={true} />

<!-- Custom classes -->
<div class="my-search-wrapper">
  <SearchAutocomplete />
</div>
```

## 🐛 Troubleshooting

### No Results Appearing

**Problem:** Typing but no results show up

**Solutions:**
1. Check query length (minimum 2 characters)
2. Verify internet connection
3. Check browser console for errors
4. Try a different search term

### Wrong Results

**Problem:** Getting results from wrong countries

**Expected:** Only Germany, Austria, Switzerland, Liechtenstein
**Check:** The service filters by country codes automatically

### Slow Performance

**Problem:** Results take too long to appear

**Normal Behavior:**
- First search: 500-1000ms (DNS lookup, SSL handshake)
- Subsequent searches: 200-500ms
- Rate limiting: 1 second between requests

## 📱 Mobile Considerations

The component is mobile-friendly with:
- Touch-optimized input
- Compact mode for small screens
- Responsive results dropdown
- Virtual keyboard handling

```svelte
<!-- Mobile-optimized -->
<SearchAutocomplete
  compact={true}
  autofocus={false}
  placeholder="Search..."
/>
```

## 🔗 Next Steps

- **Read the full guide**: [SEARCH_FEATURE.md](./SEARCH_FEATURE.md)
- **Check API reference**: [SEARCH_API_REFERENCE.md](./SEARCH_API_REFERENCE.md)
- **Try the demo**: Visit `/search-demo` in your app
- **Run tests**: `npm test src/lib/services/searchService.test.ts`

## 💡 Need Help?

- Check the [documentation](./SEARCH_FEATURE.md)
- Review [code examples](./SEARCH_API_REFERENCE.md)
- Look at the [demo page](../src/routes/(authorized)/search-demo/+page.svelte)
- Inspect the [service code](../src/lib/services/searchService.ts)

---

Happy searching! 🔍
