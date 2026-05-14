import { db } from './db';
import { segments } from './schema';
import { eq, and } from 'drizzle-orm';
import type { Stop, SegmentMode, TransitLeg } from '$lib/types';

const DE_LAT_MIN = 47.2;
const DE_LAT_MAX = 55.1;
const DE_LON_MIN = 5.9;
const DE_LON_MAX = 15.1;

function isInGermany(lat: number, lon: number): boolean {
    return lat >= DE_LAT_MIN && lat <= DE_LAT_MAX && lon >= DE_LON_MIN && lon <= DE_LON_MAX;
}

interface TransitGeoLeg {
    coords: [number, number][];
    mode: string;
    lineName?: string;
    product?: string;
}

interface ComputeResult {
    distanceM: number;
    elevationUpM: number;
    elevationDownM: number;
    travelDurationMinutes: number;
    transitSummary: string | null;
    transitLegs: TransitLeg[] | null;
    walkToStationMin: number | null;
    walkFromStationMin: number | null;
    transfers: number | null;
    walkGeometry: [number, number][] | null;
    driveGeometry: [number, number][] | null;
    transitGeometry: TransitGeoLeg[] | null;
}

export async function computeSegment(
    fromStop: Stop,
    toStop: Stop,
    journeyId: number,
    mode: SegmentMode = 'walk'
): Promise<ComputeResult> {
    let result: ComputeResult = {
        distanceM: 0,
        elevationUpM: 0,
        elevationDownM: 0,
        travelDurationMinutes: 0,
        transitSummary: null,
        transitLegs: null,
        walkToStationMin: null,
        walkFromStationMin: null,
        transfers: null,
        walkGeometry: null,
        driveGeometry: null,
        transitGeometry: null
    };

    if (mode === 'walk') {
        const walk = await computeOSRMWalk(fromStop, toStop);
        result.distanceM = walk.distanceM;
        result.travelDurationMinutes = walk.travelDurationMinutes;
        result.walkGeometry = walk.geometry;
        // elevation matters for walking
        const elev = await computeElevation(fromStop, toStop);
        result.elevationUpM = elev.up;
        result.elevationDownM = elev.down;
    } else if (mode === 'drive') {
        const drive = await computeOSRMDrive(fromStop, toStop);
        result.distanceM = drive.distanceM;
        result.travelDurationMinutes = drive.travelDurationMinutes;
        result.driveGeometry = drive.geometry;
    } else {
        // transit
        const transit = await computeTransit(fromStop, toStop);
        result.travelDurationMinutes = transit.totalDurationMinutes;
        result.transitSummary = transit.summary;
        result.transitLegs = transit.legs;
        result.walkToStationMin = transit.walkToStationMin;
        result.walkFromStationMin = transit.walkFromStationMin;
        result.transfers = transit.transfers;
        result.transitGeometry = transit.geometry;
    }

    // Upsert in DB
    const existing = await db
        .select()
        .from(segments)
        .where(and(eq(segments.fromStopId, fromStop.id), eq(segments.toStopId, toStop.id)))
        .limit(1);

    const row = {
        distanceM: result.distanceM,
        elevationUpM: result.elevationUpM,
        elevationDownM: result.elevationDownM,
        travelDurationMinutes: result.travelDurationMinutes,
        mode,
        transitSummary: result.transitSummary,
        transitLegs: result.transitLegs ? JSON.stringify(result.transitLegs) : null,
        walkToStationMin: result.walkToStationMin,
        walkFromStationMin: result.walkFromStationMin,
        transfers: result.transfers,
        walkGeometry: result.walkGeometry ? JSON.stringify(result.walkGeometry) : null,
        driveGeometry: result.driveGeometry ? JSON.stringify(result.driveGeometry) : null,
        transitGeometry: result.transitGeometry ? JSON.stringify(result.transitGeometry) : null
    };

    if (existing.length > 0) {
        await db.update(segments).set(row).where(eq(segments.id, existing[0].id));
    } else {
        await db.insert(segments).values({ journeyId, fromStopId: fromStop.id, toStopId: toStop.id, ...row });
    }

    return result;
}

// ── OSRM Walk (with geometry) ───────────────────────────────────────
async function computeOSRMWalk(from: Stop, to: Stop) {
    try {
        const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]] // GeoJSON is [lon,lat], Leaflet is [lat,lon]
            );
            return { distanceM: route.distance, travelDurationMinutes: route.duration / 60, geometry: coords };
        }
    } catch { /* fall through */ }
    const d = haversineDistance(from.lat, from.lon, to.lat, to.lon);
    return { distanceM: d, travelDurationMinutes: d / 83.33, geometry: [[from.lat, from.lon], [to.lat, to.lon]] as [number, number][] };
}

// ── OSRM Drive (with geometry) ──────────────────────────────────────
async function computeOSRMDrive(from: Stop, to: Stop) {
    try {
        const url = `https://router.project-osrm.org/route/v1/car/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
            );
            return { distanceM: route.distance, travelDurationMinutes: route.duration / 60, geometry: coords };
        }
    } catch { /* fall through */ }
    const d = haversineDistance(from.lat, from.lon, to.lat, to.lon);
    return {
        distanceM: d,
        travelDurationMinutes: d / 500,
        geometry: [[from.lat, from.lon], [to.lat, to.lon]] as [number, number][]
    };
}

// ── Transit (HAFAS) ─────────────────────────────────────────────────
interface TransitResult {
    totalDurationMinutes: number;
    summary: string;
    legs: TransitLeg[];
    walkToStationMin: number;
    walkFromStationMin: number;
    transfers: number;
    geometry: TransitGeoLeg[];
}

async function computeTransit(from: Stop, to: Stop): Promise<TransitResult> {
    const bothInGermany = isInGermany(from.lat, from.lon) && isInGermany(to.lat, to.lon);
    if (bothInGermany) {
        try {
            return await computeTransitHAFAS(from, to);
        } catch (err) {
            console.error('HAFAS transit failed:', err);
        }
    }
    // Rough fallback: ~80 km/h average regional train speed
    const d = haversineDistance(from.lat, from.lon, to.lat, to.lon);
    const estMin = Math.round((d / 1000) * (60 / 80)); // km / 80 km/h → minutes
    return {
        totalDurationMinutes: Math.max(estMin, 5),
        summary: bothInGermany ? 'Öffi (est.)' : 'Transit (est.)',
        legs: [],
        walkToStationMin: 0,
        walkFromStationMin: 0,
        transfers: 0,
        geometry: [{ coords: [[from.lat, from.lon], [to.lat, to.lon]], mode: 'transit' }]
    };
}

/**
 * Query HAFAS directly with coordinates.
 * The API resolves nearest stops internally and returns walking legs to/from stations.
 * Deutschlandticket: nationalExpress=false (no ICE), national=false (no IC/EC).
 */
async function computeTransitHAFAS(from: Stop, to: Stop): Promise<TransitResult> {
    // Step 1: find nearest stops for both endpoints
    const [fromStop, toStop] = await Promise.all([
        findNearestStop(from.lat, from.lon),
        findNearestStop(to.lat, to.lon)
    ]);

    if (!fromStop || !toStop) {
        throw new Error(`No nearby stops found (from: ${!!fromStop}, to: ${!!toStop})`);
    }

    console.log(`HAFAS: ${fromStop.name} (${fromStop.id}) → ${toStop.name} (${toStop.id})`);

    // Step 2: query journeys between station IDs (Deutschlandticket filter)
    const params = new URLSearchParams({
        from: fromStop.id,
        to: toStop.id,
        results: '3',
        nationalExpress: 'false',
        national: 'false',
        bus: 'true',
        subway: 'true',
        suburban: 'true',
        tram: 'true',
        regional: 'true',
        regionalExpress: 'true',
        stopovers: 'true',
        polylines: 'true',
        language: 'en'
    });

    const url = `https://v6.db.transport.rest/journeys?${params}`;
    console.log('HAFAS request:', url);

    const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'JourneyPlanner/1.0' }
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('HAFAS error body:', body.slice(0, 500));
        throw new Error(`HAFAS ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();

    if (!data.journeys?.length) {
        throw new Error('HAFAS returned 0 journeys');
    }

    const j = data.journeys[0];
    const rawLegs: any[] = j.legs ?? [];

    // Parse legs + build geometry
    const legs: TransitLeg[] = [];
    const geometry: TransitGeoLeg[] = [];

    for (const l of rawLegs) {
        const dep = l.departure ?? l.plannedDeparture;
        const arr = l.arrival ?? l.plannedArrival;
        const durMin = dep && arr ? (new Date(arr).getTime() - new Date(dep).getTime()) / 60000 : 0;

        const originLat = l.origin?.location?.latitude;
        const originLon = l.origin?.location?.longitude;
        const destLat = l.destination?.location?.latitude;
        const destLon = l.destination?.location?.longitude;

        let legCoords: [number, number][] = [];

        // 1. GeoJSON FeatureCollection polyline (v6.db.transport.rest format)
        if (l.polyline?.features?.length) {
            for (const f of l.polyline.features) {
                const g = f.geometry;
                if (g?.type === 'Point' && g.coordinates) {
                    legCoords.push([g.coordinates[1], g.coordinates[0]]);
                } else if (g?.type === 'LineString' && g.coordinates) {
                    for (const c of g.coordinates) legCoords.push([c[1], c[0]]);
                }
            }
        }
        // 2. Encoded polyline string (Google format)
        if (legCoords.length < 2 && typeof l.polyline === 'string') {
            legCoords = decodePolyline(l.polyline);
        }
        // 3. Stopovers
        if (legCoords.length < 2 && l.stopovers?.length) {
            for (const s of l.stopovers) {
                const lat = s.stop?.location?.latitude;
                const lon = s.stop?.location?.longitude;
                if (lat && lon) legCoords.push([lat, lon]);
            }
        }
        // 4. Origin/destination fallback
        if (legCoords.length < 2 && originLat && originLon && destLat && destLon) {
            legCoords = [[originLat, originLon], [destLat, destLon]];
        }

        if (l.walking) {
            legs.push({
                type: 'walking',
                departure: dep, arrival: arr,
                departureStation: l.origin?.name,
                arrivalStation: l.destination?.name,
                departureLat: originLat, departureLon: originLon,
                arrivalLat: destLat, arrivalLon: destLon,
                durationMinutes: Math.round(durMin),
                distanceM: l.distance ?? undefined,
                polyline: legCoords.length >= 2 ? legCoords : undefined
            });
            if (legCoords.length >= 2) {
                geometry.push({ coords: legCoords, mode: 'walking' });
            }
        } else {
            const productName = l.line?.productName ?? l.line?.product ?? '';
            const rawLineName = l.line?.name ?? l.line?.fahrtNr ?? '';
            const lineName = rawLineName.toLowerCase().startsWith(productName.toLowerCase())
                ? rawLineName : rawLineName;

            legs.push({
                type: 'transport',
                lineName, product: productName,
                direction: l.direction ?? '',
                departure: dep, arrival: arr,
                departureStation: l.origin?.name ?? '',
                arrivalStation: l.destination?.name ?? '',
                departureLat: originLat, departureLon: originLon,
                arrivalLat: destLat, arrivalLon: destLon,
                durationMinutes: Math.round(durMin),
                platform: l.departurePlatform ?? l.plannedDeparturePlatform ?? undefined,
                polyline: legCoords.length >= 2 ? legCoords : undefined
            });
            if (legCoords.length >= 2) {
                geometry.push({ coords: legCoords, mode: 'transport', lineName: lineName || productName, product: productName });
            }
        }
    }

    // Summary: clean line names, deduplicated
    const transportLegs = legs.filter((l) => l.type === 'transport');
    const lineNames = transportLegs.map((l) => {
        const p = l.product ?? '';
        const n = l.lineName ?? '';
        // If line name already contains the product (e.g. "Bus RE5" with product "Bus"), just use line name
        if (n && p && n.toLowerCase().startsWith(p.toLowerCase())) return n;
        // If they're different (e.g. product "S", name "8"), combine
        if (p && n) return `${p}${n}`;
        return n || p || 'Öffi';
    });
    const summary = lineNames.length ? lineNames.join(' → ') : 'Öffi';
    const transfers = Math.max(0, transportLegs.length - 1);

    // Walk times: from user stop coords to departure station, and from arrival station to user stop coords
    // Use OSRM foot for accuracy, with HAFAS walking legs as fallback
    let walkToStationMin = 0;
    let walkFromStationMin = 0;

    // HAFAS walking leg at start?
    if (rawLegs.length > 0 && rawLegs[0].walking) {
        const dep = rawLegs[0].departure ?? rawLegs[0].plannedDeparture;
        const arr = rawLegs[0].arrival ?? rawLegs[0].plannedArrival;
        if (dep && arr) walkToStationMin = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000);
    }
    // Also compute walk from actual stop coords to the departure station
    if (walkToStationMin === 0 && fromStop) {
        walkToStationMin = await walkDurationOSRM(from.lat, from.lon, fromStop.lat, fromStop.lon);
    }

    // HAFAS walking leg at end?
    if (rawLegs.length > 1 && rawLegs[rawLegs.length - 1].walking) {
        const dep = rawLegs[rawLegs.length - 1].departure ?? rawLegs[rawLegs.length - 1].plannedDeparture;
        const arr = rawLegs[rawLegs.length - 1].arrival ?? rawLegs[rawLegs.length - 1].plannedArrival;
        if (dep && arr) walkFromStationMin = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000);
    }
    if (walkFromStationMin === 0 && toStop) {
        walkFromStationMin = await walkDurationOSRM(toStop.lat, toStop.lon, to.lat, to.lon);
    }

    // Total: train time + walking
    const firstDep = rawLegs[0]?.departure ?? rawLegs[0]?.plannedDeparture;
    const lastArr = rawLegs[rawLegs.length - 1]?.arrival ?? rawLegs[rawLegs.length - 1]?.plannedArrival;
    let trainDuration = firstDep && lastArr
        ? Math.round((new Date(lastArr).getTime() - new Date(firstDep).getTime()) / 60000)
        : 30;

    // If HAFAS already included walk legs in its duration, don't double-count
    const hafasIncludesWalk = rawLegs[0]?.walking || rawLegs[rawLegs.length - 1]?.walking;
    const totalDuration = hafasIncludesWalk
        ? trainDuration
        : trainDuration + walkToStationMin + walkFromStationMin;

    return {
        totalDurationMinutes: totalDuration,
        summary,
        legs,
        walkToStationMin,
        walkFromStationMin,
        transfers,
        geometry
    };
}

// ── Nearest stop lookup ─────────────────────────────────────────────────
async function findNearestStop(lat: number, lon: number): Promise<{ id: string; name: string; lat: number; lon: number } | null> {
    try {
        const p = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lon),
            results: '1'
        });
        const res = await fetch(`https://v6.db.transport.rest/locations/nearby?${p}`, {
            headers: { Accept: 'application/json', 'User-Agent': 'JourneyPlanner/1.0' }
        });
        if (!res.ok) {
            console.error('findNearestStop failed:', res.status, await res.text().catch(() => ''));
            return null;
        }
        const data = await res.json();
        if (data.length > 0 && data[0].id) {
            return {
                id: String(data[0].id),
                name: data[0].name ?? '',
                lat: data[0].location?.latitude ?? lat,
                lon: data[0].location?.longitude ?? lon
            };
        }
    } catch (err) {
        console.error('findNearestStop error:', err);
    }
    return null;
}

async function walkDurationOSRM(fromLat: number, fromLon: number, toLat: number, toLon: number): Promise<number> {
    try {
        const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) return Math.round(data.routes[0].duration / 60);
    } catch { /* fall through */ }
    return Math.round(haversineDistance(fromLat, fromLon, toLat, toLon) / 83.33);
}

// ── Elevation ───────────────────────────────────────────────────────
async function computeElevation(from: Stop, to: Stop): Promise<{ up: number; down: number }> {
    try {
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${from.lat},${from.lon}|${to.lat},${to.lon}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.length === 2) {
            const diff = data.results[1].elevation - data.results[0].elevation;
            return { up: Math.max(0, diff), down: Math.abs(Math.min(0, diff)) };
        }
    } catch { /* ignore */ }
    return { up: 0, down: 0 };
}

// Decode Google encoded polyline → [lat, lon][]
function decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let i = 0, lat = 0, lon = 0;
    while (i < encoded.length) {
        let shift = 0, result = 0, byte: number;
        do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        shift = 0; result = 0;
        do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        lon += (result & 1) ? ~(result >> 1) : (result >> 1);
        points.push([lat / 1e5, lon / 1e5]);
    }
    return points;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
