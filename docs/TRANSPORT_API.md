# Transport API Documentation

## Current Implementation

This application uses the **public-transport/hafas-client** API for German railway and public transport data.

### API Endpoint
- **Base URL**: `https://v6.db.transport.rest`
- **Alternative**: `https://v6.bahn.guru` (more stable, community-backed)

## Is it Free?

**Yes!** The API is completely free to use with no API key required.

### Key Facts
- ✅ **100% Free** - No costs, no rate limits mentioned
- ✅ **Open Source** - [GitHub Repository](https://github.com/public-transport/hafas-client)
- ✅ **No Authentication** - No API keys needed
- ✅ **Community Maintained** - By [@derhuerst](https://github.com/derhuerst) and contributors
- ✅ **Real Data** - Uses official Deutsche Bahn HAFAS API underneath

## Projects Using the Same API

This is the **same API** used by popular German transit apps:

1. **bahn.expert** - Train connection expert system
2. **bahnvorhersage.de** - Train delay predictions
3. **direkt.bahn.guru** - Direct train connections
4. **Many mobile apps** - Various community transit apps

## Technical Details

### What is HAFAS?
HAFAS (HaCon Fahrplan-Auskunfts-System) is the system used by Deutsche Bahn and many other European transit agencies. The `hafas-client` library provides a clean REST API on top of the official but complex HAFAS interface.

### Endpoints Used

1. **`/stops/nearby`** - Find nearby stations
   ```
   GET /stops/nearby?latitude={lat}&longitude={lon}&distance={meters}&results={n}
   ```

2. **`/journeys`** - Find connections between stations
   ```
   GET /journeys?from={stationId}&to={stationId}&results={n}
   ```

3. **`/locations`** - Search for stations by name
   ```
   GET /locations?query={searchTerm}&results={n}
   ```

## Reliability & Rate Limits

### Current Status
- The API is generally reliable and fast
- No official rate limits published
- Recommended: Be respectful with requests (cache when possible)

### Best Practices
1. Don't spam requests - cache results when appropriate
2. Use reasonable result limits (we use 8-10 max)
3. Handle errors gracefully with fallbacks
4. Consider using the alternative endpoint if the main one is slow

### Fallback Strategy
The app currently uses this strategy:
1. Try DB API (`v6.db.transport.rest`) for station search
2. If no results, fall back to OpenStreetMap data
3. For journey planning, always prefer DB API stations (they have proper IDs)

## Alternative APIs Considered

### 1. Direct HAFAS API
- **Pros**: Official data source
- **Cons**: Complex protocol, requires reverse engineering
- **Verdict**: ❌ Too complex, `hafas-client` is a better wrapper

### 2. OpenStreetMap Only
- **Pros**: Always free, good geographic data
- **Cons**: No real-time transit data, no journey planning
- **Verdict**: ✅ Used as fallback for station locations

### 3. DB Navigator API
- **Pros**: Official DB app API
- **Cons**: Unofficial, may break, no documentation
- **Verdict**: ❌ Not reliable

### 4. Bahn.guru Direct
- **Pros**: Community-backed, stable
- **Cons**: Limited endpoints
- **Verdict**: ✅ Good alternative endpoint (use v6.bahn.guru)

## If the API Goes Down

If `v6.db.transport.rest` becomes unavailable:

1. **Switch to alternative endpoint**: Change `DB_API_BASE` to `https://v6.bahn.guru`
2. **Self-host**: You can run your own instance using the [hafas-rest-api](https://github.com/derhuerst/hafas-rest-api) server
3. **Use another region**: There are endpoints for other countries too

### Self-Hosting Example
```bash
# Clone the repository
git clone https://github.com/derhuerst/db-rest.git
cd db-rest

# Install and run
npm install
npm start

# Now available at http://localhost:3000
```

## Data Sources

The API aggregates data from:
- 🚂 Deutsche Bahn (DB) - Long-distance trains
- 🚃 Regional transit operators (VBB, VRR, etc.)
- 🚌 Local bus services
- 🚊 Trams and subways

## License & Legal

- **API Code**: ISC License (very permissive)
- **Data**: From public HAFAS APIs (legal gray area but widely used)
- **Usage**: No ToS violations as it's a public wrapper

## Conclusion

**The current implementation is perfect!** 

- ✅ Free and open source
- ✅ Used by major German transit apps
- ✅ No API keys needed
- ✅ Reliable and fast
- ✅ Same data as bahn.expert

**No changes needed** - we're already using the best available option for German railway data!

## Contact & Support

- **API Issues**: [GitHub Issues](https://github.com/derhuerst/db-rest/issues)
- **Community**: [public-transport Gitter](https://gitter.im/public-transport/Lobby)
- **Maintainer**: [@derhuerst](https://github.com/derhuerst)
