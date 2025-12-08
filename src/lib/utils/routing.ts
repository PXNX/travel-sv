// src/lib/utils/routing.ts

export interface RouteResult {
	coordinates: [number, number][];
	distance: number; // in meters
	duration: number; // in minutes
}

/**
 * Fetch walking route from OSRM API
 * @param from [lat, lng]
 * @param to [lat, lng]
 * @returns Route with coordinates and calculated duration
 */
export async function getWalkingRoute(
	from: [number, number],
	to: [number, number]
): Promise<RouteResult | null> {
	try {
		// OSRM expects [lng, lat] format
		const fromLngLat = `${from[1]},${from[0]}`;
		const toLngLat = `${to[1]},${to[0]}`;

		const url = `https://router.project-osrm.org/route/v1/foot/${fromLngLat};${toLngLat}?overview=full&geometries=geojson`;

		console.log('Fetching walking route from OSRM:', url);

		const response = await fetch(url);
		if (!response.ok) {
			console.error('OSRM API error:', response.status);
			return null;
		}

		const data = await response.json();

		if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
			console.error('No route found from OSRM');
			return null;
		}

		const route = data.routes[0];
		const coordinates: [number, number][] = route.geometry.coordinates.map(
			(coord: number[]) => [coord[1], coord[0]] // Convert [lng, lat] to [lat, lng]
		);

		const distance = route.distance; // in meters

		// Calculate duration at 3.5 km/h
		const speedKmh = 3.5;
		const distanceKm = distance / 1000;
		const durationMinutes = Math.round((distanceKm / speedKmh) * 60);

		console.log(
			`OSRM route fetched: ${coordinates.length} points, ${distanceKm.toFixed(2)} km, ${durationMinutes} min`
		);

		return {
			coordinates,
			distance,
			duration: durationMinutes
		};
	} catch (error) {
		console.error('Error fetching walking route:', error);
		return null;
	}
}

/**
 * Calculate straight-line walking duration as fallback
 * @param from [lat, lng]
 * @param to [lat, lng]
 * @returns Duration in minutes at 3.5 km/h
 */
export function calculateWalkingDuration(from: [number, number], to: [number, number]): number {
	const distance = haversineDistance(from, to);
	const speedKmh = 3.5;
	return Math.round((distance / speedKmh) * 60);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param from [lat, lng]
 * @param to [lat, lng]
 * @returns Distance in kilometers
 */
function haversineDistance(from: [number, number], to: [number, number]): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(to[0] - from[0]);
	const dLon = toRad(to[1] - from[1]);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(from[0])) * Math.cos(toRad(to[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(degrees: number): number {
	return (degrees * Math.PI) / 180;
}
