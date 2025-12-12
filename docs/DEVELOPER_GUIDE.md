# Developer Guide: Transport Search System

## Quick Start

### Using the Station Service

```typescript
import {
  findNearbyStations,
  searchConnections,
  type Station,
  type Connection
} from '$lib/services/stationService';

// Find stations near a location
const stations = await findNearbyStations([52.520008, 13.404954], 5);
// Returns up to 5 stations, sorted by distance

// Search connections
const connections = await searchConnections(
  fromStation,
  toStation,
  new Date(), // Optional departure time
  5 // Max results
);
```

### Using the Transport Editor Component

```svelte
<script>
  import TransportEditor from '$lib/components/TransportEditor.svelte';
  
  let showEditor = $state(false);
  let transport = $state(null);
  
  function handleSave(newTransport) {
    transport = newTransport;
    showEditor = false;
  }
</script>

<TransportEditor
  bind:show={showEditor}
  transport={transport}
  fromLocation="Berlin Museum"
  toLocation="Hamburg Restaurant"
  fromCoords={[52.520008, 13.404954]}
  toCoords={[53.551086, 9.993682]}
  suggestedDepartureTime={new Date('2024-03-15T11:00:00')}
  onsave={handleSave}
  oncancel={() => showEditor = false}
/>
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         User Interface Layer            │
│                                         │
│  TransportEditor.svelte                 │
│  ├─ Mode selection                      │
│  ├─ Station selection UI                │
│  ├─ Connection selection UI             │
│  └─ Manual entry form                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│                                         │
│  stationService.ts                      │
│  ├─ findNearbyStations()                │
│  ├─ searchConnections()                 │
│  └─ Utility functions                   │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼────┐  ┌────▼─────┐
│  DB API    │  │ OSM API  │
│  (Primary) │  │ (Backup) │
└────────────┘  └──────────┘
```

## Key Concepts

### 1. Progressive Station Loading

Stations are automatically loaded when the dialog opens:

```typescript
// In TransportEditor.svelte
$effect(() => {
  if (show && mode !== 'walking' && fromCoords && fromStations.length === 0) {
    loadFromStations();
  }
});
```

**Why**: Reduces user clicks and provides immediate value.

### 2. Station Source Priority

The service tries DB API first, then falls back to OSM:

```typescript
async function findNearbyStations(coords, maxResults) {
  const dbStations = await searchDBStations(...);
  
  if (dbStations.length >= 3) {
    return dbStations; // Good coverage
  }
  
  // Supplement with OSM data
  const osmStations = await searchOSMStations(...);
  return deduplicateStations([...dbStations, ...osmStations]);
}
```

**Why**: DB API has better quality data but limited geographic coverage.

### 3. Smart Departure Time Calculation

```typescript
function calculateSuggestedDepartureTime(stopIndex) {
  // Start with trip start time
  let time = new Date(currentTrip.startDate);
  
  // Add up all durations before this point
  for (let i = 0; i < stopIndex; i++) {
    time.add(stop[i].stayDuration);
    time.add(stop[i].transport?.duration);
  }
  
  return time;
}
```

**Why**: Helps users plan realistic schedules without manual calculation.

### 4. Automatic Connection Search

```typescript
// Auto-trigger when both stations are selected
$effect(() => {
  if (selectedFromStation && selectedToStation && connections.length === 0) {
    loadConnections();
  }
});
```

**Why**: Immediate feedback, users don't need to click a search button.

## API Reference

### `findNearbyStations(coords, maxResults)`

**Parameters:**
- `coords: [number, number]` - [latitude, longitude]
- `maxResults: number` - Max stations to return (default: 8)

**Returns:** `Promise<Station[]>`

**Station Type:**
```typescript
interface Station {
  id: string;              // Unique identifier
  name: string;            // Station name
  type: 'railway' | 'bus' | 'mixed';
  lat: number;
  lon: number;
  distance: number;        // Distance in meters
  products?: {...};        // DB API product info
  source: 'db' | 'osm';    // Data source
}
```

**Example:**
```typescript
const stations = await findNearbyStations([52.52, 13.40], 5);
// [
//   { id: '8011160', name: 'Berlin Hauptbahnhof', type: 'railway', ... },
//   { id: '8089021', name: 'S+U Friedrichstr.', type: 'railway', ... },
//   ...
// ]
```

### `searchConnections(fromStation, toStation, departureTime?, maxResults?)`

**Parameters:**
- `fromStation: Station` - Departure station
- `toStation: Station` - Arrival station
- `departureTime?: Date` - Desired departure (default: now)
- `maxResults?: number` - Max connections (default: 5)

**Returns:** `Promise<Connection[]>`

**Connection Type:**
```typescript
interface Connection {
  departure: Date;
  arrival: Date;
  duration: number;        // Total duration in seconds
  transfers: number;       // Number of transfers
  legs: ConnectionLeg[];   // Journey segments
  price?: {
    amount: number;
    currency: string;
  };
}

interface ConnectionLeg {
  mode: 'railway' | 'bus' | 'walking';
  line?: string;           // e.g., "ICE 1234"
  direction?: string;      // e.g., "Hamburg-Altona"
  departure: Date;
  arrival: Date;
  from: string;            // Station name
  to: string;              // Station name
  duration: number;        // Leg duration in seconds
  distance?: number;       // Distance in meters
}
```

**Example:**
```typescript
const connections = await searchConnections(
  { id: '8011160', name: 'Berlin Hbf', ... },
  { id: '8002549', name: 'Hamburg Hbf', ... },
  new Date('2024-03-15T10:00:00'),
  5
);
// [
//   {
//     departure: Date('2024-03-15T10:15:00'),
//     arrival: Date('2024-03-15T12:38:00'),
//     duration: 8580,
//     transfers: 0,
//     legs: [...]
//   },
//   ...
// ]
```

### Utility Functions

#### `formatDistance(meters: number): string`
```typescript
formatDistance(500);   // "500m"
formatDistance(1500);  // "1.5km"
```

#### `formatDuration(seconds: number): string`
```typescript
formatDuration(3600);  // "1h 0min"
formatDuration(1800);  // "30min"
```

#### `formatTime(date: Date): string`
```typescript
formatTime(new Date('2024-03-15T14:30:00'));  // "14:30"
```

## Common Patterns

### Pattern 1: Station Search with Fallback

```typescript
async function loadStations(coords) {
  isLoading = true;
  
  try {
    stations = await findNearbyStations(coords);
    
    if (stations.length === 0) {
      // Show manual entry option
      showManualEntry = true;
    } else {
      // Auto-select closest
      selectedStation = stations[0];
    }
  } catch (error) {
    console.error('Station search failed:', error);
    // Fallback to manual entry
    showManualEntry = true;
  } finally {
    isLoading = false;
  }
}
```

### Pattern 2: Connection Search with Time Suggestion

```typescript
async function loadConnections() {
  const departureTime = suggestedDepartureTime || new Date();
  
  connections = await searchConnections(
    fromStation,
    toStation,
    departureTime,
    5
  );
  
  // Highlight connection closest to suggested time
  if (suggestedDepartureTime && connections.length > 0) {
    const closest = findClosestConnection(connections, suggestedDepartureTime);
    highlightedConnection = closest;
  }
}

function findClosestConnection(connections, targetTime) {
  return connections.reduce((closest, conn) => {
    const connDiff = Math.abs(conn.departure - targetTime);
    const closestDiff = Math.abs(closest.departure - targetTime);
    return connDiff < closestDiff ? conn : closest;
  });
}
```

### Pattern 3: Walking Route Calculation

```typescript
import { getWalkingRoute, calculateWalkingDuration } from '$lib/utils/routing';

async function calculateWalking(fromCoords, toCoords) {
  try {
    // Try to get actual route
    const route = await getWalkingRoute(fromCoords, toCoords);
    
    if (route) {
      return {
        duration: route.duration,
        distance: route.distance,
        notes: `Distance: ${(route.distance / 1000).toFixed(2)} km`
      };
    }
  } catch (error) {
    console.warn('Route calculation failed, using straight-line:', error);
  }
  
  // Fallback to straight-line calculation
  const duration = calculateWalkingDuration(fromCoords, toCoords);
  return {
    duration,
    distance: null,
    notes: 'Approximate walking time (straight-line distance)'
  };
}
```

## Testing

### Unit Tests

```typescript
// stationService.test.ts
import { describe, test, expect, vi } from 'vitest';
import { findNearbyStations, searchConnections } from './stationService';

describe('stationService', () => {
  test('finds nearby stations', async () => {
    const stations = await findNearbyStations([52.52, 13.40], 5);
    
    expect(stations).toBeInstanceOf(Array);
    expect(stations.length).toBeLessThanOrEqual(5);
    
    if (stations.length > 0) {
      expect(stations[0]).toHaveProperty('id');
      expect(stations[0]).toHaveProperty('name');
      expect(stations[0]).toHaveProperty('distance');
    }
  });
  
  test('deduplicates nearby stations', async () => {
    // Mock both DB and OSM returning similar stations
    // Verify only unique stations are returned
  });
  
  test('prefers DB stations over OSM', async () => {
    // Mock scenario where both APIs return same station
    // Verify DB version is kept
  });
});
```

### Component Tests

```typescript
// TransportEditor.test.ts
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TransportEditor from './TransportEditor.svelte';

test('auto-loads stations on open', async () => {
  const { getByText } = render(TransportEditor, {
    props: {
      show: true,
      fromCoords: [52.52, 13.40],
      toCoords: [53.55, 9.99],
      // ... other props
    }
  });
  
  await waitFor(() => {
    expect(getByText(/loading/i)).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(getByText(/hauptbahnhof/i)).toBeInTheDocument();
  });
});

test('searches connections when both stations selected', async () => {
  // Test auto-trigger of connection search
});

test('fills form when connection selected', async () => {
  // Test that selecting a connection populates all fields
});
```

### Integration Tests

```typescript
// integration.test.ts
test('complete transport planning flow', async () => {
  // 1. Open editor
  // 2. Wait for stations to load
  // 3. Select stations
  // 4. Wait for connections to load
  // 5. Select connection
  // 6. Verify form is populated
  // 7. Save and verify data
});
```

## Performance Optimization

### 1. Caching Station Results

```typescript
// Simple in-memory cache
const stationCache = new Map();

async function findNearbyStations(coords, maxResults) {
  const cacheKey = `${coords[0]},${coords[1]},${maxResults}`;
  
  if (stationCache.has(cacheKey)) {
    return stationCache.get(cacheKey);
  }
  
  const stations = await fetchStations(coords, maxResults);
  stationCache.set(cacheKey, stations);
  
  return stations;
}
```

### 2. Debouncing Searches

```typescript
import { debounce } from '$lib/utils';

const debouncedSearch = debounce(async () => {
  await loadConnections();
}, 300);

// Use in reactive statement
$effect(() => {
  if (selectedFromStation && selectedToStation) {
    debouncedSearch();
  }
});
```

### 3. Request Cancellation

```typescript
let abortController = null;

async function loadConnections() {
  // Cancel previous request
  if (abortController) {
    abortController.abort();
  }
  
  abortController = new AbortController();
  
  try {
    const response = await fetch(url, {
      signal: abortController.signal
    });
    // ... process response
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
      return;
    }
    throw error;
  }
}
```

## Error Handling

### Graceful Degradation

```typescript
async function findNearbyStations(coords, maxResults) {
  let stations = [];
  
  // Try DB API
  try {
    stations = await searchDBStations(coords, maxResults);
  } catch (error) {
    console.warn('DB API failed:', error);
  }
  
  // If DB failed or limited results, try OSM
  if (stations.length < 3) {
    try {
      const osmStations = await searchOSMStations(coords, maxResults);
      stations = [...stations, ...osmStations];
    } catch (error) {
      console.warn('OSM API failed:', error);
    }
  }
  
  return deduplicateStations(stations);
}
```

### User-Friendly Error Messages

```typescript
function getErrorMessage(error) {
  if (error.message?.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }
  
  if (error.message?.includes('timeout')) {
    return 'The search is taking too long. Please try again.';
  }
  
  if (error.status === 404) {
    return 'No stations found in this area. Try manual entry.';
  }
  
  return 'Something went wrong. Please try again or enter details manually.';
}
```

## Debugging

### Enable Debug Logging

```typescript
// In stationService.ts
const DEBUG = import.meta.env.DEV;

function log(...args) {
  if (DEBUG) {
    console.log('[StationService]', ...args);
  }
}

// Usage
log('Searching stations at', coords);
log('Found', stations.length, 'stations');
```

### Inspect API Responses

```typescript
async function searchDBStations(lat, lon, maxResults) {
  const url = `${DB_API_BASE}/stops/nearby?...`;
  log('DB API Request:', url);
  
  const response = await fetch(url);
  const data = await response.json();
  
  log('DB API Response:', data);
  
  return processStations(data);
}
```

## Best Practices

### 1. Always Provide Fallbacks
```typescript
// ✅ Good
const stations = await findNearbyStations(coords) || [];
if (stations.length === 0) {
  showManualEntry = true;
}

// ❌ Bad
const stations = await findNearbyStations(coords);
// Assumes stations exist
selectedStation = stations[0];
```

### 2. Handle Loading States
```typescript
// ✅ Good
let isLoading = $state(false);

async function load() {
  isLoading = true;
  try {
    data = await fetch();
  } finally {
    isLoading = false;
  }
}

// ❌ Bad
async function load() {
  data = await fetch(); // No loading indicator
}
```

### 3. Validate User Input
```typescript
// ✅ Good
function validateConnection(connection) {
  if (!connection.departure || !connection.arrival) {
    throw new Error('Invalid connection data');
  }
  if (connection.arrival <= connection.departure) {
    throw new Error('Arrival must be after departure');
  }
}

// ❌ Bad
function saveConnection(connection) {
  // Assumes data is valid
  store.save(connection);
}
```

### 4. Use TypeScript
```typescript
// ✅ Good
function processStation(station: Station): FormattedStation {
  return {
    id: station.id,
    name: station.name,
    distance: formatDistance(station.distance)
  };
}

// ❌ Bad
function processStation(station) {
  // No type safety
  return { ... };
}
```

## FAQ

**Q: Why use two different APIs (DB and OSM)?**
A: DB API has better quality data for Germany but limited coverage in rural areas. OSM provides global coverage as a fallback.

**Q: How do I add support for another country?**
A: Create a new service in `src/lib/services/` following the same pattern as `stationService.ts`, then add conditional logic based on coordinates.

**Q: Can I cache station results?**
A: Yes, but be careful with caching strategies. Stations don't change often, but real-time departure data should not be cached.

**Q: How do I handle API rate limits?**
A: Implement request debouncing and caching. For production, consider a backend proxy to pool requests.

**Q: What if no stations are found?**
A: Always show a fallback option (manual entry or walking mode) when station search fails.

---

**Need help?** Open an issue or check the full documentation in `/docs`.
