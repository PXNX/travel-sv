// src/lib/utils/germanTransport.ts

interface Location {
	latitude: number;
	longitude: number;
}

interface Journey {
	type: 'journey';
	legs: Array<{
		origin: {
			name: string;
			location: { latitude: number; longitude: number };
		};
		destination: {
			name: string;
			location: { latitude: number; longitude: number };
		};
		departure: string; // ISO timestamp
		arrival: string;
		line?: {
			name: string; // e.g., "RE 7", "S 1"
			product: string; // e.g., "regional", "suburban"
			mode: string; // e.g., "train", "bus"
		};
		duration: number; // in seconds
		distance?: number; // in meters
	}>;
}

const DB_API_BASE = 'https://v6.db.transport.rest';

/**
 * Search for locations (stations, stops)
 */
export async function searchLocations(query: string): Promise<any[]> {
	try {
		const response = await fetch(
			`${DB_API_BASE}/locations?query=${encodeURIComponent(query)}&results=5`
		);
		if (!response.ok) throw new Error('Failed to search locations');
		return await response.json();
	} catch (error) {
		console.error('Error searching locations:', error);
		return [];
	}
}

/**
 * Find nearby stations/stops
 */
export async function findNearbyStops(lat: number, lon: number, distance = 1000): Promise<any[]> {
	try {
		const response = await fetch(
			`${DB_API_BASE}/stops/nearby?latitude=${lat}&longitude=${lon}&distance=${distance}&results=10`
		);
		if (!response.ok) throw new Error('Failed to find nearby stops');
		return await response.json();
	} catch (error) {
		console.error('Error finding nearby stops:', error);
		return [];
	}
}

/**
 * Get journey options between two locations
 */
export async function getJourneys(
	from: string | Location,
	to: string | Location,
	options?: {
		departure?: Date;
		results?: number;
		transfers?: number;
	}
): Promise<Journey[]> {
	try {
		const params = new URLSearchParams();

		// Handle location format
		if (typeof from === 'string') {
			params.append('from', from);
		} else {
			params.append('from.latitude', from.latitude.toString());
			params.append('from.longitude', from.longitude.toString());
		}

		if (typeof to === 'string') {
			params.append('to', to);
		} else {
			params.append('to.latitude', to.latitude.toString());
			params.append('to.longitude', to.longitude.toString());
		}

		if (options?.departure) {
			params.append('departure', options.departure.toISOString());
		}

		if (options?.results) {
			params.append('results', options.results.toString());
		}

		if (options?.transfers !== undefined) {
			params.append('transfers', options.transfers.toString());
		}

		const response = await fetch(`${DB_API_BASE}/journeys?${params}`);
		if (!response.ok) throw new Error('Failed to get journeys');

		const data = await response.json();
		return data.journeys || [];
	} catch (error) {
		console.error('Error getting journeys:', error);
		return [];
	}
}

/**
 * Convert journey leg to your TransportSegment format
 */
export function convertLegToTransportSegment(leg: Journey['legs'][0]) {
	const departure = new Date(leg.departure);
	const arrival = new Date(leg.arrival);
	const durationMinutes = Math.round(leg.duration / 60);

	// Determine mode
	let mode: 'railway' | 'bus' | 'walking' = 'railway';
	if (leg.line) {
		if (leg.line.mode === 'bus') {
			mode = 'bus';
		} else if (leg.line.product === 'regional' || leg.line.product === 'suburban') {
			mode = 'railway';
		}
	} else {
		mode = 'walking';
	}

	return {
		mode,
		departureTime: departure.toTimeString().slice(0, 5),
		arrivalTime: arrival.toTimeString().slice(0, 5),
		durationMinutes,
		routeName: leg.line?.name,
		notes: leg.distance ? `Distance: ${(leg.distance / 1000).toFixed(2)} km` : undefined
	};
}

/**
 * Get real-time departures from a station
 */
export async function getDepartures(stationId: string, duration = 60): Promise<any[]> {
	try {
		const response = await fetch(
			`${DB_API_BASE}/stops/${stationId}/departures?duration=${duration}`
		);
		if (!response.ok) throw new Error('Failed to get departures');

		const data = await response.json();
		return data.departures || [];
	} catch (error) {
		console.error('Error getting departures:', error);
		return [];
	}
}
