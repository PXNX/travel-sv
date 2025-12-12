// src/lib/services/stationService.ts
/**
 * Unified station and connection search service
 * Handles DB API with OSM fallback for comprehensive coverage
 */

export interface Station {
    id: string;
    name: string;
    type: 'railway' | 'bus' | 'mixed';
    lat: number;
    lon: number;
    distance: number;
    importance: number;
    products?: {
        nationalExpress?: boolean;
        national?: boolean;
        regionalExp?: boolean;
        regional?: boolean;
        suburban?: boolean;
        bus?: boolean;
        ferry?: boolean;
        subway?: boolean;
        tram?: boolean;
        taxi?: boolean;
    };
    source: 'db' | 'osm';
}

export interface Connection {
    departure: Date;
    arrival: Date;
    duration: number; // seconds
    transfers: number;
    legs: ConnectionLeg[];
    price?: {
        amount: number;
        currency: string;
    };
}

export interface ConnectionLeg {
    mode: 'railway' | 'bus' | 'walking';
    line?: string;
    direction?: string;
    departure: Date;
    arrival: Date;
    from: string;
    to: string;
    duration: number; // seconds
    distance?: number; // meters
    stopovers?: Array<{
        stop: {
            name: string;
            location: { latitude: number; longitude: number };
        };
    }>;
    polyline?: {
        features: Array<{
            type: string;
            geometry: {
                type: string;
                coordinates: number[][];
            };
        }>;
    };
}

const DB_API_BASE = 'https://v6.db.transport.rest';
const SEARCH_RADIUS = 5000; // 5km

/**
 * Search for stations near coordinates with DB API first, OSM as fallback
 */
export async function findNearbyStations(
    coords: [number, number],
    maxResults = 8
): Promise<Station[]> {
    const [lat, lon] = coords;

    // Try DB API first (better quality data)
    const dbStations = await searchDBStations(lat, lon, maxResults);
    console.log(`Found ${dbStations.length} DB stations near ${lat},${lon}:`, dbStations.map(s => s.name));

    if (dbStations.length >= 3) {
        // Good coverage from DB API
        return dbStations;
    }

    // Limited DB coverage, supplement with OSM
    const osmStations = await searchOSMStations(lat, lon, maxResults);
    console.log(`Found ${osmStations.length} OSM stations`);

    // Merge and deduplicate by name and proximity
    const allStations = [...dbStations, ...osmStations];
    const uniqueStations = deduplicateStations(allStations);
    console.log(`Total unique stations: ${uniqueStations.length}`);

    return uniqueStations
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults);
}

/**
 * Search using Deutsche Bahn API
 */
async function searchDBStations(
    lat: number,
    lon: number,
    maxResults: number
): Promise<Station[]> {
    try {
        const response = await fetch(
            `${DB_API_BASE}/stops/nearby?latitude=${lat}&longitude=${lon}&distance=${SEARCH_RADIUS}&results=${maxResults * 2}`
        );

        if (!response.ok) {
            console.warn('DB API error:', response.status);
            return [];
        }

        const stops = await response.json();

        if (!Array.isArray(stops) || stops.length === 0) {
            return [];
        }

        return stops
            .filter((stop: any) => stop.id && stop.name)
            .map((stop: any) => {
                // Determine type from available products
                let type: 'railway' | 'bus' | 'mixed' = 'bus';
                const products = stop.products || {};

                const hasRail = products.nationalExpress || products.national ||
                    products.regionalExp || products.regional || products.suburban;
                const hasBus = products.bus;

                if (hasRail && hasBus) {
                    type = 'mixed';
                } else if (hasRail) {
                    type = 'railway';
                }

                // Calculate importance based on available products
                let importance = 0;
                if (products.nationalExpress) importance += 100;
                if (products.national) importance += 80;
                if (products.regionalExp) importance += 60;
                if (products.regional) importance += 40;
                if (products.suburban) importance += 30;
                if (products.bus) importance += 20;
                if (products.subway) importance += 50;
                if (products.tram) importance += 20;
                // Cap at 100
                importance = Math.min(importance, 100);

                return {
                    id: stop.id,
                    name: stop.name,
                    type,
                    lat: stop.location?.latitude,
                    lon: stop.location?.longitude,
                    distance: stop.distance || 0,
                    importance,
                    products,
                    source: 'db' as const
                };
            })
            .filter((s: Station) => s.lat && s.lon);
    } catch (error) {
        console.error('Error fetching DB stations:', error);
        return [];
    }
}

/**
 * Search using OpenStreetMap (Overpass API)
 */
async function searchOSMStations(
    lat: number,
    lon: number,
    maxResults: number
): Promise<Station[]> {
    try {
        const query = `
[out:json][timeout:25];
(
  node["railway"="station"](around:${SEARCH_RADIUS},${lat},${lon});
  node["railway"="halt"](around:${SEARCH_RADIUS},${lat},${lon});
  node["public_transport"="station"](around:${SEARCH_RADIUS},${lat},${lon});
  node["highway"="bus_stop"](around:${SEARCH_RADIUS},${lat},${lon});
  way["railway"="station"](around:${SEARCH_RADIUS},${lat},${lon});
  way["public_transport"="station"](around:${SEARCH_RADIUS},${lat},${lon});
);
out center;
		`.trim();

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
        });

        if (!response.ok) {
            console.warn('Overpass API error:', response.status);
            return [];
        }

        const data = await response.json();

        return data.elements
            .filter((el: any) => el.tags && (el.tags.name || el.tags.ref))
            .map((el: any) => {
                const elLat = el.center?.lat || el.lat;
                const elLon = el.center?.lon || el.lon;

                if (!elLat || !elLon) return null;

                const distance = getDistanceInMeters(lat, lon, elLat, elLon);

                // Determine type and importance
                let type: 'railway' | 'bus' | 'mixed' = 'bus';
                let importance = 20; // Default for bus stops

                if (el.tags.railway === 'station') {
                    type = 'railway';
                    importance = 60; // Railway station
                } else if (el.tags.railway === 'halt') {
                    type = 'railway';
                    importance = 40; // Smaller halt
                } else if (el.tags.public_transport === 'station') {
                    type = 'railway';
                    importance = 50;
                }

                return {
                    id: `osm-${el.id}`,
                    name: el.tags.name || el.tags.ref || 'Unnamed Stop',
                    type,
                    lat: elLat,
                    lon: elLon,
                    distance,
                    importance,
                    source: 'osm' as const
                };
            })
            .filter((s: Station | null): s is Station => s !== null);
    } catch (error) {
        console.error('Error fetching OSM stations:', error);
        return [];
    }
}

/**
 * Deduplicate stations that are very close and have similar names
 */
function deduplicateStations(stations: Station[]): Station[] {
    const unique: Station[] = [];

    for (const station of stations) {
        const isDuplicate = unique.some((existing) => {
            const distance = getDistanceInMeters(
                station.lat,
                station.lon,
                existing.lat,
                existing.lon
            );
            const nameSimilar =
                station.name.toLowerCase().includes(existing.name.toLowerCase()) ||
                existing.name.toLowerCase().includes(station.name.toLowerCase());

            // Consider duplicate if within 100m and similar name
            return distance < 100 && nameSimilar;
        });

        if (!isDuplicate) {
            unique.push(station);
        } else if (station.source === 'db') {
            // Prefer DB station over OSM if duplicate
            const index = unique.findIndex((existing) => {
                const distance = getDistanceInMeters(
                    station.lat,
                    station.lon,
                    existing.lat,
                    existing.lon
                );
                return distance < 100 && existing.source === 'osm';
            });
            if (index !== -1) {
                unique[index] = station;
            }
        }
    }

    return unique;
}

/**
 * Search for connections between stations
 */
export async function searchConnections(
    fromStation: Station,
    toStation: Station,
    departureTime?: Date,
    maxResults = 5,
    options?: {
        deutschlandTicketOnly?: boolean;
        minTransferTime?: number;
        maxTransferTime?: number;
    }
): Promise<Connection[]> {
    try {
        const params = new URLSearchParams();

        // Use station ID if from DB API, otherwise use coordinates
        if (fromStation.source === 'db') {
            params.append('from', fromStation.id);
            console.log(`From station (DB): ${fromStation.name} (${fromStation.id})`);
        } else {
            params.append('from.latitude', fromStation.lat.toString());
            params.append('from.longitude', fromStation.lon.toString());
            params.append('from.address', fromStation.name);
            console.log(`From station (OSM): ${fromStation.name} @ ${fromStation.lat},${fromStation.lon}`);
        }

        if (toStation.source === 'db') {
            params.append('to', toStation.id);
            console.log(`To station (DB): ${toStation.name} (${toStation.id})`);
        } else {
            params.append('to.latitude', toStation.lat.toString());
            params.append('to.longitude', toStation.lon.toString());
            params.append('to.address', toStation.name);
            console.log(`To station (OSM): ${toStation.name} @ ${toStation.lat},${toStation.lon}`);
        }

        if (departureTime && departureTime instanceof Date && !isNaN(departureTime.getTime())) {
            params.append('departure', departureTime.toISOString());
            console.log(`Departure time: ${departureTime.toISOString()}`);
        } else {
            console.log('No departure time specified, using current time');
        }

        params.append('results', maxResults.toString());
        params.append('stopovers', 'true'); // Get all intermediate stops for route visualization
        params.append('polyline', 'true'); // Get route polyline for map visualization

        // Apply Deutschland Ticket filter (exclude long-distance trains)
        if (options?.deutschlandTicketOnly) {
            // Exclude IC/ICE/EC trains at API level
            params.append('nationalExpress', 'false'); // ICE
            params.append('national', 'false');        // IC/EC
            console.log('Deutschland Ticket mode: excluding IC/ICE/EC trains');
        }

        const url = `${DB_API_BASE}/journeys?${params}`;
        console.log(`Fetching journeys from: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Journey search failed:', response.status, errorText);
            console.error('Request URL:', url);
            return [];
        }

        const data = await response.json();
        console.log('API Response:', data);
        const journeys = data.journeys || [];
        console.log(`Found ${journeys.length} journeys`);

        return journeys.map((journey: any) => {
            const departure = new Date(journey.legs[0].departure);
            const arrival = new Date(journey.legs[journey.legs.length - 1].arrival);
            const duration = Math.round((arrival.getTime() - departure.getTime()) / 1000);

            const legs: ConnectionLeg[] = journey.legs.map((leg: any) => {
                let mode: 'railway' | 'bus' | 'walking' = 'walking';
                if (leg.line) {
                    mode = leg.line.mode === 'bus' ? 'bus' : 'railway';
                }

                return {
                    mode,
                    line: leg.line?.name,
                    direction: leg.direction,
                    departure: new Date(leg.departure),
                    arrival: new Date(leg.arrival),
                    from: leg.origin?.name || '',
                    to: leg.destination?.name || '',
                    duration: leg.duration || 0,
                    distance: leg.distance,
                    stopovers: leg.stopovers, // Preserve stopovers for route visualization
                    polyline: leg.polyline // Preserve polyline for route visualization
                };
            });

            const transfers = legs.filter((leg) => leg.line).length - 1;

            return {
                departure,
                arrival,
                duration,
                transfers: Math.max(0, transfers),
                legs,
                price: journey.price
            };
        });
    } catch (error) {
        console.error('Error searching connections:', error);
        return [];
    }
}

/**
 * Calculate distance between two coordinates in meters
 */
function getDistanceInMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
