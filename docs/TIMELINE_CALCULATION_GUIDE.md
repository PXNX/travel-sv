# Timeline Calculation Quick Reference

## How Trip Timeline Works

### Basic Formula

For each location in the trip:

```
Arrival Time = Previous Departure Time + Transport Duration
Departure Time = Arrival Time + Stay Duration
```

### Complete Example

#### Trip Setup
- Start: 08:00
- Location 1: Museum (1h visit)
- Location 2: Park (45min visit)  
- Location 3: Restaurant (1.5h visit)

#### Calculation Steps

**Location 1 (Museum)**
```
Arrival:   08:00 (trip start time)
Stay:      1h (60 min)
Departure: 08:00 + 1h = 09:00
```

**Transport 1 → 2 (Walking)**
```
Duration:  30 min
Start:     09:00 (Location 1 departure)
End:       09:00 + 30min = 09:30
```

**Location 2 (Park)**
```
Arrival:   09:30 (Transport 1 end time)
Stay:      45 min
Departure: 09:30 + 45min = 10:15
```

**Transport 2 → 3 (Public Transport)**
```
Search time:      10:15 (Location 2 departure)
Walk to station:  5 min (09:15 → 10:20)
Train departs:    10:25 (found connection)
Train arrives:    11:05
Walk to location: 10 min (11:05 → 11:15)
Total duration:   60 min
```

**Location 3 (Restaurant)**
```
Arrival:   11:15 (Transport 2 end time)
Stay:      1.5h (90 min)
Departure: 11:15 + 1h 30min = 12:45
```

### Timeline Display

```
08:00  📍 Museum
       (1h stay)
09:00  🚶 Walking (30min)
09:30  📍 Park
       (45min stay)
10:15  🚂 Train RE7 (1h)
       10:25 → 11:15
11:15  📍 Restaurant
       (1h 30min stay)
12:45  End
```

## Implementation Code

### Calculate Single Location Timeline

```typescript
function getLocationTiming(
    arrivalMinutes: number,
    stayDuration: number
) {
    return {
        arrivalTime: formatTime(arrivalMinutes),
        departureTime: formatTime(arrivalMinutes + stayDuration),
        stayDuration: stayDuration
    };
}
```

### Calculate Full Trip Timeline

```typescript
function getTimelineData(stops, startTime) {
    let currentMinutes = parseTime(startTime); // e.g., "08:00" → 480

    return stops.map((stop, index) => {
        // Arrive at this location
        const arrivalMinutes = currentMinutes;
        const stayDuration = stop.customDuration || stop.location.durationMinutes;
        const departureMinutes = arrivalMinutes + stayDuration;

        // Calculate time to next location
        if (index < stops.length - 1) {
            const nextStop = stops[index + 1];
            const transport = nextStop.transport;
            
            if (transport) {
                // Add transport duration for next segment
                currentMinutes = departureMinutes + transport.durationMinutes;
            }
        }

        return {
            arrivalTime: formatTime(arrivalMinutes),
            departureTime: formatTime(departureMinutes),
            stayDuration
        };
    });
}
```

### Calculate Suggested Departure Time for Public Transport

```typescript
function calculateSuggestedDepartureTime(stopIndex: number) {
    let cumulativeMinutes = 0;
    
    // Sum all time up to this point
    for (let i = 0; i < stopIndex; i++) {
        const stop = stops[i];
        
        // Add stay time
        const stayDuration = stop.customDuration || 60;
        cumulativeMinutes += stayDuration;
        
        // Add transport time to next location
        if (i < stopIndex - 1 && stops[i + 1].transport) {
            cumulativeMinutes += stops[i + 1].transport.durationMinutes;
        }
    }
    
    // Return start time + cumulative minutes
    const departureTime = new Date(startTime);
    departureTime.setMinutes(departureTime.getMinutes() + cumulativeMinutes);
    return departureTime;
}
```

## Common Scenarios

### Scenario 1: All Walking

```
08:00 Location A (30min stay)
08:30 Walk (15min)
08:45 Location B (45min stay)
09:30 Walk (20min)
09:50 Location C
```

**Code:**
```typescript
stops = [
    { location: A, stayDuration: 30, transport: { mode: 'walking', duration: 15 } },
    { location: B, stayDuration: 45, transport: { mode: 'walking', duration: 20 } },
    { location: C, stayDuration: 60 }
];
```

### Scenario 2: Mixed Transport

```
09:00 Location A (1h stay)
10:00 Train (30min)
10:30 Location B (30min stay)
11:00 Walk (10min)
11:10 Location C
```

**Code:**
```typescript
stops = [
    { location: A, stayDuration: 60, transport: { mode: 'railway', duration: 30 } },
    { location: B, stayDuration: 30, transport: { mode: 'walking', duration: 10 } },
    { location: C, stayDuration: 60 }
];
```

### Scenario 3: Public Transport with Station Walking

**User sees:**
```
10:15 Depart Location A
10:45 Arrive Location B
Duration: 30min (shown as train time)
```

**Actually happens:**
```
10:15 Leave Location A
10:20 Walk to station (5min)
10:25 Board train
10:35 Arrive at destination station
10:40 Walk to Location B (5min)
10:45 Arrive at Location B
```

**Duration breakdown:**
- Walk to station: 5min
- Wait time: ~0min (train departs immediately)
- Train travel: 10min
- Walk from station: 5min
- **Total: 30min**

## Helper Functions

### Format Time

```typescript
function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Examples:
formatTime(480)  // "08:00"
formatTime(615)  // "10:15"
formatTime(750)  // "12:30"
```

### Parse Time

```typescript
function parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Examples:
parseTime("08:00")  // 480
parseTime("10:15")  // 615
parseTime("12:30")  // 750
```

### Add Time

```typescript
function addMinutesToTime(timeString: string, minutesToAdd: number): string {
    const minutes = parseTime(timeString);
    return formatTime(minutes + minutesToAdd);
}

// Examples:
addMinutesToTime("08:00", 75)   // "09:15"
addMinutesToTime("10:15", 30)   // "10:45"
addMinutesToTime("23:30", 45)   // "00:15" (next day)
```

## Debugging Tips

### Log Timeline Calculation

```typescript
console.log('=== Timeline Calculation ===');
console.log(`Start time: ${startTime}`);

let currentMinutes = parseTime(startTime);
stops.forEach((stop, i) => {
    console.log(`\nStop ${i + 1}: ${stop.location.title}`);
    console.log(`  Arrive: ${formatTime(currentMinutes)}`);
    console.log(`  Stay: ${stop.stayDuration}min`);
    currentMinutes += stop.stayDuration;
    console.log(`  Depart: ${formatTime(currentMinutes)}`);
    
    if (stop.transport) {
        console.log(`  Transport: ${stop.transport.mode} (${stop.transport.duration}min)`);
        currentMinutes += stop.transport.duration;
    }
});

console.log(`\nEnd time: ${formatTime(currentMinutes)}`);
```

### Verify Cumulative Time

```typescript
// Calculate total trip duration
const totalMinutes = stops.reduce((sum, stop, i) => {
    let duration = stop.stayDuration;
    if (i < stops.length - 1 && stops[i + 1].transport) {
        duration += stops[i + 1].transport.duration;
    }
    return sum + duration;
}, 0);

console.log(`Total trip duration: ${formatDuration(totalMinutes)}`);
// Should match: (end time) - (start time)
```

## Edge Cases

### Midnight Crossing

```typescript
// 23:30 + 45min = 00:15 (next day)
const result = addMinutesToTime("23:30", 45);
// result: "00:15"

// Using modulo to handle 24h wrap
const hours = Math.floor(totalMinutes / 60) % 24;
```

### No Transport Specified

```typescript
// If no transport between locations, assume immediate arrival
if (nextStop.transport) {
    currentMinutes += nextStop.transport.duration;
} else {
    // currentMinutes stays same (no travel time)
}
```

### Default Values

```typescript
// Use sensible defaults
const stayDuration = stop.customDuration 
    || stop.location?.durationMinutes 
    || 60; // default 1 hour

const transportDuration = stop.transport?.duration 
    || 0; // default no transport time
```

## Best Practices

1. **Always track cumulative time** - Don't calculate each segment independently
2. **Include all time components** - Stay duration + transport duration
3. **Use consistent time format** - Always HH:MM with leading zeros
4. **Handle day boundaries** - Use modulo 24 for hours
5. **Provide defaults** - Have fallback values for missing data
6. **Log intermediate steps** - Easier debugging of complex timelines
7. **Validate inputs** - Check for negative durations, invalid times
8. **Consider timezones** - For multi-day trips across time zones

## Quick Reference

| Operation | Formula | Example |
|-----------|---------|---------|
| Location departure | Arrival + Stay | 08:00 + 60min = 09:00 |
| Next arrival | Departure + Transport | 09:00 + 30min = 09:30 |
| Total trip time | Sum of all stays + transports | 60 + 30 + 45 = 135min = 2h 15min |
| Public transport search | Previous departure time | Search at 10:15 if leaving at 10:15 |
| Format duration | Use formatDuration() | 90min → "1h 30min" |
