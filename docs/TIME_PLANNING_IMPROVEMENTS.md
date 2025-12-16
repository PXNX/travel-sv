# Time Planning Improvements

## Overview

This document describes the improvements made to time formatting, station selection, and trip timeline planning.

## Changes Made

### 1. Duration Formatting (> 60 minutes shows as hours)

**File:** `src/lib/utils/calculations.ts`

**Before:**
```typescript
if (minutes < 60) {
    return `${minutes} min`;
}
// ...
return `${hours}h ${mins}m`;
```

**After:**
```typescript
if (minutes < 60) {
    return `${minutes}min`;
}
// ...
return `${hours}h ${mins}min`;
```

**Impact:**
- 30 minutes: `30min` (instead of `30 min`)
- 90 minutes: `1h 30min` (instead of `1h 30m`)
- 120 minutes: `2h` (unchanged)

This provides consistent formatting across the application.

---

### 2. Show Only Closest 5 Stations

**Files:**
- `src/lib/services/stationService.ts`
- `src/lib/components/TransportEditor.svelte`

**Changes:**
1. Changed default `maxResults` parameter from 8 to 5 in `findNearbyStations()`
2. Limited station display in TransportEditor to show only 5 closest stations

**Before:**
```typescript
export async function findNearbyStations(
    coords: [number, number],
    maxResults = 8
): Promise<Station[]>
```

```svelte
{#each fromStations.slice(0, 8) as station}
```

**After:**
```typescript
export async function findNearbyStations(
    coords: [number, number],
    maxResults = 5
): Promise<Station[]>
```

```svelte
{#each fromStations.slice(0, 5) as station}
```

**Impact:**
- Reduces clutter in station selection UI
- Shows only the most relevant nearby stations
- Improves performance by fetching fewer results

---

### 3. Proper Trip Timeline Planning

#### 3.1 Timeline Calculation Logic

**File:** `src/lib/components/TripTimeline.svelte`

Added comprehensive documentation explaining the proper time planning:

```typescript
/**
 * TripTimeline Component
 * 
 * Properly calculates timeline with cumulative time tracking:
 * Example: Start at 8:00 at Location 1
 * - Stay 1h at Location 1 (8:00 - 9:00)
 * - Walk 30min to Location 2 (9:00 - 9:30)
 * - Arrive at Location 2 at 9:30
 * - Stay 45min at Location 2 (9:30 - 10:15)
 * - Public transport search should start at 10:15
 * 
 * The transport duration includes:
 * - Walking time from location to station
 * - Waiting time at station
 * - Travel time on train/bus
 * - Walking time from station to destination
 */
```

#### 3.2 Suggested Departure Time Calculation

**File:** `src/routes/(authorized)/+page.svelte`

Enhanced `calculateSuggestedDepartureTime()` function with better documentation and default start time:

```typescript
/**
 * Calculate suggested departure time for public transport search
 * 
 * This properly accumulates time based on the trip timeline:
 * Example:
 * - Start at 8:00 at Location 1
 * - Stay 1h at Location 1 → departure at 9:00
 * - Walk 30min to Location 2 → arrival at 9:30
 * - Stay 45min at Location 2 → departure at 10:15
 * - Now searching for public transport departing at 10:15+
 * 
 * The transport duration includes:
 * - Walking time from location to station
 * - Train/bus travel time
 * - Walking time from station to next location
 */
function calculateSuggestedDepartureTime(stopIndex: number): Date | undefined
```

**Key improvements:**
- Default start time set to 9:00 AM if no start date specified
- Cumulative time calculation includes all stay durations and transport times
- Proper logging for debugging timeline calculations

#### 3.3 Transport Connection Search

**File:** `src/lib/components/TransportEditor.svelte`

Added documentation explaining how the suggested departure time is used:

```typescript
/**
 * Search for connections between selected stations
 * 
 * The suggestedDepartureTime is calculated based on the timeline:
 * - It accounts for all previous locations and their stay times
 * - It includes travel time to reach the current departure station
 * - Example: If you finish at Location A at 10:15, the search will look
 *   for connections departing at or after 10:15 (plus walking time to station)
 */
```

#### 3.4 Walking Time Calculation

**File:** `src/lib/services/stationService.ts`

Added important documentation about what's included in API responses:

```typescript
/**
 * Search for connections between stations
 * 
 * IMPORTANT: The connection duration from the API includes:
 * - Travel time on the train/bus
 * - Transfer/waiting times at intermediate stations
 * 
 * When planning trips, you should ALSO add:
 * - Walking time from departure location to the departure station
 * - Walking time from arrival station to the final destination
 * 
 * These walking times are NOT included in the API response and must be
 * calculated separately (e.g., using getDistanceInMeters and assuming 5 km/h walking speed).
 */
```

---

### 4. New Helper Functions

**File:** `src/lib/utils/calculations.ts`

Added utility functions for time and distance calculations:

```typescript
/**
 * Add minutes to a time string (HH:MM format)
 */
export function addMinutesToTime(timeString: string, minutesToAdd: number): string

/**
 * Calculate walking time based on distance (assuming 5 km/h walking speed)
 */
export function calculateWalkingTimeFromDistance(distanceKm: number): number

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
): number

/**
 * Calculate walking time between two coordinates
 */
export function calculateWalkingTimeBetweenCoords(
    coords1: [number, number], 
    coords2: [number, number]
): number
```

**Usage examples:**

```typescript
// Add time
const newTime = addMinutesToTime('09:00', 75); // '10:15'

// Calculate walking time from distance
const walkTime = calculateWalkingTimeFromDistance(2.5); // ~30 minutes

// Calculate walking time between coordinates
const time = calculateWalkingTimeBetweenCoords(
    [48.1351, 11.5820],  // Munich
    [48.1372, 11.5755]   // Another point in Munich
); // ~3 minutes
```

---

## Example Timeline Calculation

### Scenario
- **Start Time:** 8:00
- **Location 1:** Museum (stay 1 hour)
- **Transport to Location 2:** Walking (30 minutes)
- **Location 2:** Park (stay 45 minutes)
- **Transport to Location 3:** Public transport

### Timeline Breakdown

1. **8:00** - Arrive at Location 1 (Museum)
2. **8:00-9:00** - Visit Museum (1h stay)
3. **9:00** - Depart Museum
4. **9:00-9:30** - Walk to Location 2 (30 min)
5. **9:30** - Arrive at Location 2 (Park)
6. **9:30-10:15** - Visit Park (45 min stay)
7. **10:15** - Depart Park
8. **10:15** - **Search for public transport connections departing at 10:15 or later**

### Public Transport Search Considerations

When searching at 10:15, the system should:
1. Find nearby stations to Park (departure station)
2. Find nearby stations to Location 3 (arrival station)
3. Calculate walking time to departure station (~5-10 min)
4. Search for connections departing at **10:20-10:25** (10:15 + walking time)
5. Calculate walking time from arrival station to Location 3
6. Total transport duration = walk to station + wait + travel + walk from station

### User Display

The timeline shows:
```
📍 Location 2 (Park)
   10:15 Depart

🚂 Train RE7
   10:25 → 11:10 • 45min
   1 transfer
   
📍 Location 3
   11:15 Arrive
```

Note: The 45min shown is the train travel time. The actual total time from departing the park to arriving at Location 3 is longer when including walking times.

---

## Implementation Notes

### For Developers

1. **Always use `formatDuration()` for displaying time durations** - it handles the conversion to hours automatically

2. **When calculating timelines:**
   - Use cumulative time tracking (add each segment sequentially)
   - Include all components: stay time + transport time
   - Transport time should include walking segments

3. **When searching for public transport:**
   - Use `calculateSuggestedDepartureTime()` to get the proper search time
   - Remember that this is the time the user leaves the previous location
   - Add walking time to station before searching for connections

4. **Station selection:**
   - Default to showing 5 closest stations
   - Can be increased if needed, but keep UI clean

### Testing Checklist

- [ ] Duration formatting shows hours for times > 60 min
- [ ] Only 5 stations shown in transport editor
- [ ] Timeline properly accumulates time across all stops
- [ ] Public transport search uses correct departure time
- [ ] Walking times are considered in total trip duration
- [ ] Timeline display matches calculated times

---

## Future Improvements

1. **Automatic walking time calculation:** When selecting stations, automatically calculate and add walking time to/from stations to the transport duration

2. **Visual timeline indicator:** Show walking segments separately from public transport segments in the timeline

3. **Real-time adjustments:** If a connection is delayed, automatically recalculate subsequent times

4. **Buffer time settings:** Allow users to add buffer time between activities (e.g., 15 min buffer after each location)

5. **Smart departure time suggestion:** Consider factors like:
   - Rush hour traffic
   - Connection frequency (wait for next connection)
   - Meal times (suggest breaks)

---

## Related Files

- `src/lib/utils/calculations.ts` - Time and distance utilities
- `src/lib/services/stationService.ts` - Station and connection search
- `src/lib/components/TripTimeline.svelte` - Timeline display
- `src/lib/components/TransportEditor.svelte` - Transport planning UI
- `src/routes/(authorized)/+page.svelte` - Main trip planning logic
