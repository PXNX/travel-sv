# Architecture Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           TransportEditor.svelte                    │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │   Mode      │  │   Station    │  │Connection │ │   │
│  │  │  Selection  │→ │   Selection  │→ │ Selection │ │   │
│  │  └─────────────┘  └──────────────┘  └───────────┘ │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         Manual Entry Form (Optional)         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                    │
└────────────────────┼────────────────────────────────────┘
                     │
                     │ Uses
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           stationService.ts                         │   │
│  │                                                     │   │
│  │  ┌──────────────────┐  ┌───────────────────────┐  │   │
│  │  │  findNearby      │  │  searchConnections    │  │   │
│  │  │  Stations()      │  │  ()                   │  │   │
│  │  └────────┬─────────┘  └─────────┬─────────────┘  │   │
│  │           │                       │                │   │
│  │           ├─ searchDBStations()  │                │   │
│  │           ├─ searchOSMStations() │                │   │
│  │           └─ deduplicateStations()               │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Utilities: formatDistance(), formatTime()   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────┬──────────┬──────────────────────┘   │
│                    │          │                          │
└────────────────────┼──────────┼──────────────────────────┘
                     │          │
        ┌────────────┘          └────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐
│   DB API         │                 │   OSM Overpass   │
│   (Primary)      │                 │   (Fallback)     │
│                  │                 │                  │
│  v6.db.transport │                 │  overpass-api.de │
│  .rest           │                 │                  │
└──────────────────┘                 └──────────────────┘
```

## Data Flow

### 1. Station Discovery Flow

```
User Opens TransportEditor
        │
        ▼
┌───────────────────┐
│ Component Mounts  │
│ $effect() trigger │
└────────┬──────────┘
         │
         ▼
┌─────────────────────────────────┐
│ loadFromStations()              │
│ loadToStations()                │
│ (Called automatically)          │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ stationService.findNearbyStations│
│ (coords, maxResults)             │
└────────┬─────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ searchDBStations│  │searchOSMStations│
│                 │  │   (if needed)   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ deduplicateStations │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ Sort by distance    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ Return top N results│
         └──────────┬──────────┘
                    │
                    ▼
┌────────────────────────────────┐
│ Component receives stations    │
│ Auto-selects closest           │
│ Renders station list           │
└────────────────────────────────┘
```

### 2. Connection Search Flow

```
User Selects From Station
        │
        ▼
User Selects To Station
        │
        ▼
┌───────────────────┐
│ $effect() trigger │
│ (both selected)   │
└────────┬──────────┘
         │
         ▼
┌─────────────────────────────────┐
│ loadConnections()               │
│ (Called automatically)          │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Calculate departure time:        │
│ - Use suggestedDepartureTime OR  │
│ - Parse user input time OR       │
│ - Use current time               │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ stationService.searchConnections │
│ (from, to, time, maxResults)     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ DB API: /journeys endpoint       │
│ - Uses station IDs (DB stations) │
│ - Or coordinates (OSM stations)  │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Process journey results:         │
│ - Extract departure/arrival      │
│ - Calculate duration             │
│ - Count transfers                │
│ - Format leg information         │
└────────┬─────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Component receives connections  │
│ Renders as interactive cards    │
│ Highlights suggested option     │
└────────────────────────────────┘
```

### 3. Time Suggestion Flow

```
User Opens Transport Between Stop N and Stop N+1
        │
        ▼
┌────────────────────────────────────────┐
│ openTransportEditor(stopIndex, ...)    │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ calculateSuggestedDepartureTime(index) │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Start with trip.startDate or now       │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Loop through stops 0 to index-1:       │
│                                        │
│ For each stop:                         │
│   cumulativeTime += stop.stayDuration  │
│   cumulativeTime += transport.duration │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ suggestedTime = startDate + cumulative │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Pass to TransportEditor component      │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Used in connection search              │
│ Displayed to user as hint              │
└────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────┐
│         TransportEditor Component           │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │        Form State                  │    │
│  │  - mode                            │    │
│  │  - departureTime                   │    │
│  │  - arrivalTime                     │    │
│  │  - durationMinutes                 │    │
│  │  - routeName                       │    │
│  │  - notes                           │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │     Station Search State           │    │
│  │  - fromStations[]                  │    │
│  │  - toStations[]                    │    │
│  │  - selectedFromStation             │    │
│  │  - selectedToStation               │    │
│  │  - isLoadingFromStations           │    │
│  │  - isLoadingToStations             │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    Connection Search State         │    │
│  │  - connections[]                   │    │
│  │  - selectedConnection              │    │
│  │  - isLoadingConnections            │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │         UI State                   │    │
│  │  - showManualEntry                 │    │
│  │  - isCalculatingWalking            │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Reactive Effects ($effect)

```
┌──────────────────────────────────────────┐
│  Effect 1: Auto-load From Stations      │
│                                          │
│  Triggers when:                          │
│  - show === true                         │
│  - mode !== 'walking'                    │
│  - fromCoords exists                     │
│  - fromStations.length === 0             │
│                                          │
│  Action: loadFromStations()              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Effect 2: Auto-load To Stations        │
│                                          │
│  Triggers when:                          │
│  - show === true                         │
│  - mode !== 'walking'                    │
│  - toCoords exists                       │
│  - toStations.length === 0               │
│                                          │
│  Action: loadToStations()                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Effect 3: Auto-search Connections      │
│                                          │
│  Triggers when:                          │
│  - selectedFromStation exists            │
│  - selectedToStation exists              │
│  - connections.length === 0              │
│                                          │
│  Action: loadConnections()               │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Effect 4: Auto-calculate Walking       │
│                                          │
│  Triggers when:                          │
│  - mode === 'walking'                    │
│  - fromCoords exists                     │
│  - toCoords exists                       │
│  - show === true                         │
│  - durationMinutes === 30 (default)      │
│                                          │
│  Action: calculateWalkingTime()          │
└──────────────────────────────────────────┘
```

## User Interaction Sequence

```
┌───────────────────────────────────────────────────────────┐
│                    SCENARIO: Planning Trip                │
└───────────────────────────────────────────────────────────┘

Time: 09:00 - User adds "Museum" (stay 2h)
Time: 11:00 - User adds "Restaurant" (stay 1.5h)
Time: ???  - User needs transport between them

                    ┌─────────────────┐
                    │ User clicks     │
                    │ "Add Transport" │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ TransportEditor opens        │
              │ Props received:              │
              │ - fromLocation: "Museum"     │
              │ - toLocation: "Restaurant"   │
              │ - fromCoords: [52.5, 13.4]   │
              │ - toCoords: [52.52, 13.41]   │
              │ - suggestedTime: 11:00       │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ $effect triggers             │
              │ Auto-load stations           │
              └──────────┬───────────────────┘
                         │
              ┌──────────┴───────────┐
              │                      │
              ▼                      ▼
   ┌──────────────────┐   ┌──────────────────┐
   │ Load From        │   │ Load To          │
   │ Stations         │   │ Stations         │
   │                  │   │                  │
   │ Found:           │   │ Found:           │
   │ - Hauptbf (500m) │   │ - Altona (300m)  │
   │ - Friedr (800m)  │   │ - Dammtor (600m) │
   │ - Alex (1.2km)   │   │ - HbF (1km)      │
   └──────────┬───────┘   └──────────┬───────┘
              │                      │
              │ Auto-select closest  │
              │                      │
              ▼                      ▼
   ┌──────────────────┐   ┌──────────────────┐
   │ ✓ Hauptbf        │   │ ✓ Altona         │
   └──────────┬───────┘   └──────────┬───────┘
              │                      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ $effect triggers             │
              │ Both stations selected       │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ Load Connections             │
              │ Using suggestedTime: 11:00   │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ Connections found:           │
              │                              │
              │ 🔵 11:15 → 11:32 (Direct)   │ ← Suggested
              │    11:45 → 12:05 (1 trans)  │
              │    12:15 → 12:32 (Direct)   │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ User taps first card         │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ Form auto-fills:             │
              │ - Departure: 11:15           │
              │ - Arrival: 11:32             │
              │ - Duration: 17 min           │
              │ - Route: S-Bahn S5           │
              │ - Notes: Direct connection   │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ User clicks "Save"           │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ Transport saved to trip      │
              │ Dialog closes                │
              │ ✅ Done in 20 seconds!       │
              └──────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────────────┐
│         Station Search Fails             │
└──────────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌────────────────┐
│ DB API Error  │    │ OSM API Error  │
└───────┬───────┘    └────────┬───────┘
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Try fallback API    │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌────────────────────┐
│ Fallback OK   │    │ All APIs failed    │
│ Return data   │    │                    │
└───────────────┘    └────────┬───────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Show helpful error: │
                   │                     │
                   │ ℹ️ No stations found│
                   │                     │
                   │ Options:            │
                   │ [Enter Manually]    │
                   │ [Use Walking]       │
                   └─────────────────────┘
```

## Performance Optimization Points

```
┌─────────────────────────────────────────────┐
│         Optimization Opportunities          │
└─────────────────────────────────────────────┘

1. ┌──────────────────────────────────────┐
   │ Station Result Caching               │
   │                                      │
   │ Cache key: "lat,lon,maxResults"     │
   │ TTL: 1 hour                          │
   │ Storage: Memory Map                  │
   └──────────────────────────────────────┘

2. ┌──────────────────────────────────────┐
   │ Request Debouncing                   │
   │                                      │
   │ Connection search: 300ms delay       │
   │ Prevents rapid-fire API calls        │
   └──────────────────────────────────────┘

3. ┌──────────────────────────────────────┐
   │ Parallel Station Loading             │
   │                                      │
   │ From & To stations load simultaneously│
   │ Uses Promise.all() internally        │
   └──────────────────────────────────────┘

4. ┌──────────────────────────────────────┐
   │ Lazy Connection Search               │
   │                                      │
   │ Only searches when both stations set │
   │ Avoids wasteful partial searches     │
   └──────────────────────────────────────┘

5. ┌──────────────────────────────────────┐
   │ Request Cancellation                 │
   │                                      │
   │ Abort previous request if new one    │
   │ Uses AbortController                 │
   └──────────────────────────────────────┘
```

## Component Lifecycle

```
┌─────────────────────────────────────────────────────┐
│               Component Lifecycle                   │
└─────────────────────────────────────────────────────┘

Mount
  │
  ▼
┌────────────────────────────────────────┐
│ Initialize state variables             │
│ - All arrays empty []                  │
│ - All booleans false                   │
│ - Form fields empty ""                 │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ show prop becomes true                 │
│ (User opens dialog)                    │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ $effect(() => { initializeForm() })    │
│                                        │
│ If editing:                            │
│   Populate form with existing data     │
│   Show manual entry section            │
│                                        │
│ If new:                                │
│   Reset to defaults                    │
│   Use suggested departure time         │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ $effect(() => { loadFromStations() })  │
│ Triggered by: show && fromCoords       │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ $effect(() => { loadToStations() })    │
│ Triggered by: show && toCoords         │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ User interactions...                   │
│ - Select stations                      │
│ - Select connections                   │
│ - Edit form fields                     │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ User clicks Save/Cancel                │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ show prop becomes false                │
│ Dialog closes                          │
└────────────┬───────────────────────────┘
             │
             ▼
Unmount (or stay mounted, hidden)
```

---

## Summary

This architecture provides:

- ✅ **Clear separation of concerns** (UI vs Service vs API)
- ✅ **Reactive data flow** (automatic updates via $effect)
- ✅ **Resilient error handling** (fallbacks at multiple levels)
- ✅ **Performance optimization** (parallel loading, caching ready)
- ✅ **User-centric design** (automatic, progressive, smart defaults)

The system is designed to be:

- **Maintainable**: Clear structure, single responsibility
- **Testable**: Service layer can be unit tested
- **Extensible**: Easy to add new features or transport providers
- **Resilient**: Multiple fallback mechanisms
