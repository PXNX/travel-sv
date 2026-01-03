# OSM Integration: Usage Examples

## Real-World Usage Scenarios

### Scenario 1: Planning a Munich Day Trip

**Goal**: Create a full day itinerary in Munich

**Steps**:
1. Navigate to "Browse OpenStreetMap Places"
2. Select "Munich" from city options
3. Search for "Marienplatz" → Add
4. Search for "Hofbräuhaus" → Add  
5. Search for "Englischer Garten" → Add
6. Search for "BMW Museum" → Add

**Result**: 4 locations added in ~2 minutes with:
- Accurate coordinates
- Auto-detected categories
- Estimated durations
- Full addresses

**Traditional Time**: 15-20 minutes
**OSM Time**: 2 minutes
**Time Saved**: 85-90%

---

### Scenario 2: Quick Restaurant Add

**Goal**: Add a specific restaurant you found

**Steps**:
1. Click map to open "Add New Location"
2. Type "Zum Franziskaner München" in OSM search
3. Select from autocomplete
4. Form auto-fills:
   - ✓ Title: "Zum Franziskaner"
   - ✓ Category: Food & Dining (detected)
   - ✓ Duration: 90 minutes (estimated)
   - ✓ Address: Full address from OSM
5. Edit description to add personal notes
6. Save

**Result**: Restaurant added with verified data in 30 seconds

---

### Scenario 3: Creating a Museum Route

**Goal**: Plan a museum day in Berlin

**Browse Method**:
1. Go to Browse page
2. Select "Berlin"
3. Set category filter to "Museum & Culture"
4. Search "museums berlin"
5. Results show on map:
   - Pergamon Museum
   - Neues Museum
   - Alte Nationalgalerie
   - DDR Museum
6. Click each marker, add to collection

**Alternative Method** (Using Add Page):
1. Go to Add New Location
2. Search "Pergamon Museum"
3. Select → Auto-fills → Save
4. Repeat for other museums

**Result**: Complete museum route with:
- All major museums
- Auto-detected 2-hour durations
- Clustered on map
- Ready to add to trip

---

### Scenario 4: Exploring a New City

**Goal**: Discover interesting places in Salzburg

**Steps**:
1. Browse page → Select "Salzburg"
2. Try different searches:
   - "attractions" → Hohensalzburg Fortress, Mozart's Birthplace
   - "cafes" → Café Tomaselli, Café Bazar
   - "parks" → Mirabell Gardens, Kapuzinerberg
3. Build a collection of 10+ places
4. Review on map to plan optimal route
5. Add selected places to your trip

**Result**: Comprehensive list of places to visit, all with verified data

---

## Category Detection Examples

### Food & Dining
```
Search: "Hofbräuhaus München"
OSM Type: "restaurant" 
→ Detected: Food & Dining
→ Duration: 90 minutes
→ Description: "A restaurant in Munich, Bavaria, Germany."
```

### Museum & Culture
```
Search: "Deutsches Museum"
OSM Type: "museum"
→ Detected: Museum & Culture
→ Duration: 120 minutes
→ Description: "A museum in Munich, Bavaria, Germany."
```

### Nature & Outdoors
```
Search: "Englischer Garten"
OSM Type: "park"
→ Detected: Nature & Outdoors
→ Duration: 120 minutes
→ Description: "A park in Munich, Bavaria, Germany."
```

### Leisure
```
Search: "Neuschwanstein Castle"
OSM Type: "castle"
→ Detected: Leisure
→ Duration: 90 minutes
→ Description: "A castle in Schwangau, Bavaria, Germany."
```

---

## Search Pattern Examples

### Specific Place
```
Input: "Brandenburg Gate"
Results:
├─ Brandenburg Gate, Berlin ⭐ (highest importance)
├─ Brandenburg Gate Underground Station
└─ Brandenburg Gate Visitor Center

Select: Brandenburg Gate (main)
Auto-fills: Title, coordinates, address, category (Leisure)
```

### General Category Near City
```
Input: "restaurants near Innsbruck"
Results (proximity sorted):
├─ Gasthaus Anich
├─ Goldener Adler
├─ Restaurant Ottoburg
├─ Lichtblick
└─ ...more

All detected as: Food & Dining
Durations: 60-90 minutes
```

### POI Type Search
```
Input: "museums Vienna"
Results:
├─ Kunsthistorisches Museum (museum) → 120 min
├─ Naturhistorisches Museum (museum) → 120 min
├─ Albertina (gallery) → 90 min
├─ Belvedere (castle/museum) → 90 min
└─ ...more

All detected as: Museum & Culture
```

### Landmark Search
```
Input: "Matterhorn"
Results:
├─ Matterhorn (peak) → Nature & Outdoors
├─ Matterhorn Museum → Museum & Culture
└─ Matterhorn Glacier Paradise → Leisure

Each with appropriate category and duration
```

---

## Advanced Usage Patterns

### Building a Complete Itinerary

**Morning** (Browse → "cafes Munich"):
- ✓ Café Frischhut (30 min)
- ✓ Café Luitpold (30 min)

**Late Morning** (Search → "museums Munich"):
- ✓ Deutsches Museum (120 min)

**Lunch** (Search → "restaurants Marienplatz"):
- ✓ Ratskeller München (90 min)

**Afternoon** (Browse → "parks Munich"):
- ✓ Englischer Garten (120 min)

**Evening** (Search → "beer halls Munich"):
- ✓ Hofbräuhaus (90 min)

**Total**: 6 locations, 8 hours, added in 5 minutes

---

### Multi-City Trip Planning

**Vienna Day 1**:
```
Browse → Vienna → "attractions"
→ Stephansdom, Hofburg, Belvedere
Category: Leisure
Add all three (2 minutes)
```

**Vienna Day 2**:
```
Browse → Vienna → "museums"
→ Kunsthistorisches, Naturhistorisches
Category: Museum & Culture
Add both (1 minute)
```

**Salzburg Day 3**:
```
Browse → Salzburg → "Mozart"
→ Mozart's Birthplace, Mozart Residence
Category: Museum & Culture
Add both (1 minute)
```

**Result**: 3-day itinerary, 7 locations, 4 minutes total

---

## Editing OSM-Sourced Locations

### Personalizing Descriptions
```
Original (auto-generated):
"A restaurant in Munich, Bavaria, Germany. 
Feel free to add more details about your experience here!"

Edit to:
"Traditional Bavarian beer hall with great atmosphere! 
Try their Schweinebraten. Gets crowded after 7pm. 
Reservations recommended on weekends."
```

### Adjusting Durations
```
Auto-detected: 90 minutes
Your experience: Spent 120 minutes
→ Change duration to 120
→ Better reflects your actual visit
```

### Correcting Categories
```
Auto-detected: Leisure (for historic castle)
Your preference: Museum & Culture (focuses on tours)
→ Change category manually
→ Groups better with other cultural sites
```

### Adding Extra Info
```
Auto-filled:
- Title: "Café Central"
- Description: "A cafe in Vienna..."

Add:
- Image URL: https://...
- Google Maps URL: https://maps.google.com/...
- Tags: "historic", "coffee", "desserts"
```

---

## Troubleshooting Examples

### Problem: No Results Found
```
Search: "Octoberfest"
Results: None

Solution:
→ Try: "Theresienwiese München" (official location)
→ Or: "Oktoberfest München" (correct spelling)
Results: ✓ Theresienwiese found
```

### Problem: Wrong Category Detected
```
Search: "Residenz München"
Auto-detected: Leisure
Expected: Museum & Culture

Solution:
→ Simply change dropdown to "Museum & Culture"
→ Or add "museum" to search: "Residenz Museum München"
```

### Problem: Too Many Results
```
Search: "restaurant"
Results: 20+ generic restaurants

Solution:
→ Be more specific: "Augustiner am Platzl"
→ Or use category filter: Set to "Food & Dining"
→ Or narrow by city: "restaurant near Marienplatz"
```

### Problem: Coordinates Slightly Off
```
OSM location: Slightly different from actual entrance

Solution:
→ Use map picker to adjust exact position
→ Click map at correct location
→ Coordinates update while keeping other OSM data
```

---

## Best Practices

### 1. Start Specific, Get Broader
```
✓ Good: "Hofbräuhaus München" → Exact place
✓ Good: "restaurants Munich" → Multiple options
✗ Too broad: "food" → Too many results
```

### 2. Use City Names
```
✓ "Stephansdom Vienna"
✓ "parks Berlin"
✗ "cathedral" (could be anywhere)
```

### 3. Review Auto-Filled Data
```
Always check:
├─ Description (add personal notes)
├─ Duration (adjust to your plans)
├─ Category (verify accuracy)
└─ Coordinates (confirm on map)
```

### 4. Combine Methods
```
Browse page: Explore and discover
Add page: Quick add known places
Manual entry: For custom/private locations
```

### 5. Leverage Filters
```
Planning food tour → Set category to "Food"
Museum day → Set category to "Museums"
Outdoor day → Set category to "Nature"
```

---

## Time Savings Comparison

| Task | Manual Entry | OSM Method | Time Saved |
|------|--------------|------------|------------|
| 1 Restaurant | 3-5 min | 30 sec | 83-90% |
| 1 Museum | 3-5 min | 30 sec | 83-90% |
| Day Trip (6 places) | 18-30 min | 3-5 min | 75-83% |
| Weekend Trip (12 places) | 36-60 min | 6-10 min | 75-83% |
| Week Trip (30 places) | 90-150 min | 15-25 min | 75-83% |

---

## Summary

The OSM integration transforms location entry from a **tedious data entry task** into a **fast discovery experience**. Users spend less time typing and more time planning their trips!
