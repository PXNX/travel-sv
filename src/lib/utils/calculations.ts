import type { TripStop } from '$lib/types';

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (mins === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${mins}m`;
}

export function getTotalTripDuration(stops: TripStop[], tipsMap: Map<number, any>): number {
	return stops.reduce((total, stop) => {
		const tip = tipsMap.get(stop.tipId);
		return total + (stop.customDuration || tip?.durationMinutes || 60);
	}, 0);
}
