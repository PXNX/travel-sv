# Search Feature Documentation Index

## 📚 Overview

This application features a powerful dual search system using OpenStreetMap Nominatim API, specifically designed for German-speaking regions (Germany, Austria, Switzerland, Liechtenstein).

## 🗂️ Documentation Files

### For Users

- **[Quick Start Guide](docs/SEARCH_QUICK_START.md)** ⚡
  - Get started in 5 minutes
  - Common usage examples
  - Copy-paste code snippets
  - **Start here!**

- **[Feature Guide](docs/SEARCH_FEATURE.md)** 📖
  - Complete feature overview
  - Technical details
  - Performance considerations
  - Best practices

### For Developers

- **[API Reference](docs/SEARCH_API_REFERENCE.md)** 🔧
  - Complete API documentation
  - Function signatures
  - Type definitions
  - Code examples

- **[Implementation Summary](docs/SEARCH_IMPLEMENTATION_SUMMARY.md)** 📋
  - Files created/modified
  - Architecture overview
  - Testing guide
  - Deployment checklist

## 🎯 What You Can Search

### 1. **Locations** (Geographic)
- Cities and towns (Berlin, Munich, Vienna, Zürich)
- Addresses (Marienplatz 1, München)
- Regions (Bayern, Schwarzwald)
- Administrative areas

### 2. **Places** (Points of Interest)
- 🍽️ Restaurants, cafes, bars
- 🏛️ Museums, galleries, theaters
- 🏨 Hotels, attractions
- 🌳 Parks, gardens, nature
- 🛍️ Shops, markets
- 🏰 Historic sites, monuments

## 🌍 Coverage

Search is restricted to:
- 🇩🇪 **Germany** (Deutschland)
- 🇦🇹 **Austria** (Österreich)
- 🇨🇭 **Switzerland** (Schweiz)
- 🇱🇮 **Liechtenstein**

## ⚡ Quick Example

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
</script>

<!-- Search for cities -->
<SearchAutocomplete
  searchType="location"
  placeholder="Search cities..."
  onselect={(result) => {
    console.log('Selected:', result.name);
  }}
/>

<!-- Search for restaurants -->
<SearchAutocomplete
  searchType="place"
  category="food"
  placeholder="Find restaurants..."
  onselect={(result) => {
    console.log('Found:', result.name);
  }}
/>
```

## 📁 File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── SearchAutocomplete.svelte    # UI Component
│   └── services/
│       ├── searchService.ts              # Core service
│       ├── searchService.d.ts            # Type definitions
│       └── searchService.test.ts         # Tests
└── routes/
    └── (authorized)/
        └── search-demo/
            └── +page.svelte              # Demo page

docs/
├── SEARCH_QUICK_START.md                 # Quick start guide
├── SEARCH_FEATURE.md                     # Full feature guide
├── SEARCH_API_REFERENCE.md               # API reference
└── SEARCH_IMPLEMENTATION_SUMMARY.md      # Implementation details
```

## 🚀 Getting Started

### 1. Use the Component (Recommended)

```svelte
<script>
  import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
</script>

<SearchAutocomplete
  searchType="location"
  onselect={(result) => {
    // Handle selection
    console.log(result);
  }}
/>
```

### 2. Use the Service Directly

```typescript
import { searchLocations, searchPlaces } from '$lib/services/searchService';

// Search for locations
const results = await searchLocations('Berlin');

// Search for places
const places = await searchPlaces('restaurant', {
  category: 'food',
  limit: 10
});
```

### 3. Try the Demo

Visit `/search-demo` in your application to see an interactive demonstration.

## ✨ Key Features

- ✅ **Dual Search**: Separate location and place search
- ✅ **Fuzzy Autocomplete**: Real-time suggestions as you type
- ✅ **Keyboard Navigation**: Arrow keys, Enter, Escape
- ✅ **Rate Limited**: Respects API usage policy (1 req/sec)
- ✅ **Debounced**: 300ms delay reduces API calls
- ✅ **Accessible**: ARIA labels, keyboard support
- ✅ **TypeScript**: Full type safety
- ✅ **Mobile Friendly**: Touch-optimized UI
- ✅ **Error Handling**: Graceful error states
- ✅ **Loading States**: Visual feedback
- ✅ **OSM Attribution**: Proper credit displayed

## 📖 Documentation Reading Order

**New to the search feature?**
1. [Quick Start Guide](docs/SEARCH_QUICK_START.md) - Get coding fast
2. [Try the Demo](/search-demo) - See it in action
3. [Feature Guide](docs/SEARCH_FEATURE.md) - Learn the details

**Integrating into your app?**
1. [API Reference](docs/SEARCH_API_REFERENCE.md) - Function signatures
2. [Quick Start Guide](docs/SEARCH_QUICK_START.md) - Code examples
3. [Implementation Summary](docs/SEARCH_IMPLEMENTATION_SUMMARY.md) - Architecture

**Want to understand the implementation?**
1. [Implementation Summary](docs/SEARCH_IMPLEMENTATION_SUMMARY.md) - Overview
2. [Feature Guide](docs/SEARCH_FEATURE.md) - Technical details
3. Source code in `src/lib/services/searchService.ts`

## 🧪 Testing

Run the test suite:

```bash
npm test src/lib/services/searchService.test.ts
```

**Note:** Tests make real API calls to Nominatim. Run sparingly to respect their usage policy.

## 🎨 Customization

The search component is highly customizable:

```svelte
<SearchAutocomplete
  placeholder="Custom placeholder..."
  searchType="location"
  limit={15}
  compact={true}
  autofocus={true}
  showClearButton={true}
  nearCoords={{ lat: 48.1351, lon: 11.5820 }}
  onselect={handleSelect}
  onclear={handleClear}
/>
```

## 🔧 Technical Stack

- **API**: OpenStreetMap Nominatim
- **UI**: Svelte 5 + DaisyUI
- **Language**: TypeScript
- **Map**: Leaflet
- **Testing**: Vitest

## 📊 Performance

- **Debounce**: 300ms delay
- **Rate Limit**: 1 request/second (automatic)
- **Response Time**: 200-1000ms
- **Result Limit**: Configurable (default: 10)

## 🔒 Privacy & Attribution

- ✅ No API key required
- ✅ No user data collected
- ✅ GDPR compliant
- ✅ Proper OSM attribution
- ✅ User-Agent header included

## 🐛 Troubleshooting

**No results?**
- Query must be at least 2 characters
- Check internet connection
- Verify you're searching in allowed countries

**Slow response?**
- First request is slower (DNS, SSL)
- Rate limiting adds delays between requests
- This is normal and expected

**Wrong results?**
- Verify search type (location vs place)
- Check category filter (for places)
- Try more specific search terms

## 🤝 Contributing

When extending the search functionality:

1. Maintain rate limiting
2. Keep country filtering
3. Write tests
4. Update documentation
5. Follow code style

## 📞 Support

- **Questions?** Check the [Quick Start Guide](docs/SEARCH_QUICK_START.md)
- **Issues?** See [Troubleshooting](docs/SEARCH_QUICK_START.md#-troubleshooting)
- **API help?** Read the [API Reference](docs/SEARCH_API_REFERENCE.md)
- **Examples?** Visit `/search-demo`

## 📚 External Resources

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim API](https://nominatim.org/)
- [OSM Tags](https://wiki.openstreetmap.org/wiki/Map_features)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

## 🎯 Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start](docs/SEARCH_QUICK_START.md) | Get started fast | All users |
| [Feature Guide](docs/SEARCH_FEATURE.md) | Learn features | All users |
| [API Reference](docs/SEARCH_API_REFERENCE.md) | API docs | Developers |
| [Implementation](docs/SEARCH_IMPLEMENTATION_SUMMARY.md) | Technical details | Developers |

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**License**: Same as main project  

Happy searching! 🔍✨
