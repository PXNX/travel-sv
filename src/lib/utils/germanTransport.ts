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
		polyline?: {
			features: Array<{
				type: string;
				geometry: {
					type: string;
					coordinates: number[][];
				};
			}>;
		};
		stopovers?: Array<{
			stop: {
				name: string;
				location: { latitude: number; longitude: number };
			};
		}>;
	}>;
}

// Using public-transport/hafas-client API - free and open source
// This is the same API used by bahn.expert and other open projects
// See: https://github.com/public-transport/hafas-client
// Alternative stable endpoint: https://v6.bahn.guru
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
		transferTime?: number; // Minimum transfer time in minutes
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

		if (options?.transferTime !== undefined && options.transferTime > 0) {
			params.append('transferTime', options.transferTime.toString());
		}

		// Request polyline data for route visualization
		params.append('polyline', 'true');
		params.append('stopovers', 'true');

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
 * Get transit route with actual track/road polyline
 * @param from Location coordinates
 * @param to Location coordinates
 * @returns Route coordinates following actual transit paths
 */
export async function getTransitRoute(
	from: [number, number],
	to: [number, number]
): Promise<[number, number][] | null> {
	try {
		const journeys = await getJourneys(
			{ latitude: from[0], longitude: from[1] },
			{ latitude: to[0], longitude: to[1] },
			{ results: 1 }
		);

		if (!journeys || journeys.length === 0) {
			console.log('No transit journeys found');
			return null;
		}

		const journey = journeys[0];
		console.log('Journey data:', JSON.stringify(journey, null, 2));
		const allCoordinates: [number, number][] = [];

		// Process each leg of the journey
		for (const leg of journey.legs) {
			console.log('Processing leg:', {
				origin: leg.origin.name,
				destination: leg.destination.name,
				hasPolyline: !!leg.polyline,
				hasStopovers: !!leg.stopovers,
				stopoversCount: leg.stopovers?.length || 0,
				hasLine: !!leg.line
			});

			// Skip walking legs - we only want transit legs
			if (!leg.line) {
				console.log('Skipping walking leg');
				continue;
			}

			// Try to use polyline data if available (most detailed)
			if (leg.polyline?.features && leg.polyline.features.length > 0) {
				console.log('Using polyline data');
				for (const feature of leg.polyline.features) {
					if (feature.geometry?.coordinates) {
						// Polyline coordinates are in [lng, lat] format, convert to [lat, lng]
						const coords = feature.geometry.coordinates.map(
							(coord: number[]) => [coord[1], coord[0]] as [number, number]
						);
						console.log(`Added ${coords.length} polyline points`);
						allCoordinates.push(...coords);
					}
				}
			} else if (leg.stopovers && leg.stopovers.length > 0) {
				// Use stopover locations to create route through stations
				console.log(`Using ${leg.stopovers.length} stopover locations`);

				// Add origin
				allCoordinates.push([
					leg.origin.location.latitude,
					leg.origin.location.longitude
				]);

				// Add all intermediate stopovers
				for (const stopover of leg.stopovers) {
					if (stopover.stop?.location) {
						allCoordinates.push([
							stopover.stop.location.latitude,
							stopover.stop.location.longitude
						]);
						console.log(`Added stopover: ${stopover.stop.name}`);
					}
				}

				// Add destination
				allCoordinates.push([
					leg.destination.location.latitude,
					leg.destination.location.longitude
				]);
			} else {
				// Last fallback: just origin and destination
				console.log('Using origin and destination only (no stopovers/polyline)');
				allCoordinates.push(
					[leg.origin.location.latitude, leg.origin.location.longitude],
					[leg.destination.location.latitude, leg.destination.location.longitude]
				);
			}
		}

		if (allCoordinates.length > 0) {
			console.log(`Transit route completed with ${allCoordinates.length} total points`);
			return allCoordinates;
		}

		console.log('No coordinates found');
		return null;
	} catch (error) {
		console.error('Error getting transit route:', error);
		return null;
	}
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
