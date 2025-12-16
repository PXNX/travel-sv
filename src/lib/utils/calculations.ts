import type { TripStop } from '$lib/types';

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (mins === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${mins}min`;
}

/**
 * Format duration in seconds to readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30min" or "45min"
 */
export function formatDurationSeconds(seconds: number): string {
	const totalMinutes = Math.floor(seconds / 60);
	return formatDuration(totalMinutes);
}

export function getTotalTripDuration(stops: TripStop[], tipsMap: Map<number, any>): number {
	return stops.reduce((total, stop) => {
		const tip = tipsMap.get(stop.tipId);
		return total + (stop.customDuration || tip?.durationMinutes || 60);
	}, 0);
}

/**
 * Add minutes to a time string (HH:MM format)
 * @param timeString - Time in HH:MM format
 * @param minutesToAdd - Minutes to add (can be negative)
 * @returns New time in HH:MM format
 */
export function addMinutesToTime(timeString: string, minutesToAdd: number): string {
	const [hours, minutes] = timeString.split(':').map(Number);
	const totalMinutes = hours * 60 + minutes + minutesToAdd;
	const newHours = Math.floor(totalMinutes / 60) % 24;
	const newMinutes = totalMinutes % 60;
	return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Calculate walking time based on distance (assuming 5 km/h walking speed)
 * @param distanceKm - Distance in kilometers
 * @returns Walking time in minutes
 */
export function calculateWalkingTimeFromDistance(distanceKm: number): number {
	const walkingSpeedKmh = 5;
	return Math.ceil((distanceKm / walkingSpeedKmh) * 60);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
		Math.cos((lat2 * Math.PI) / 180) *
		Math.sin(dLon / 2) *
		Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculate walking time between two coordinates
 * @param coords1 - [latitude, longitude] of first point
 * @param coords2 - [latitude, longitude] of second point
 * @returns Walking time in minutes
 */
export function calculateWalkingTimeBetweenCoords(
	coords1: [number, number],
	coords2: [number, number]
): number {
	const distanceKm = calculateDistance(coords1[0], coords1[1], coords2[0], coords2[1]);
	return calculateWalkingTimeFromDistance(distanceKm);
}
