import type { Stop, Segment } from './types';

// T23 — Compute total journey duration from stops and segments
export function computeTotalDuration(stops: Stop[], segments: Segment[]): number {
    let total = 0;

    for (const stop of stops) {
        total += stop.stayDurationMinutes ?? 0;
    }

    for (const segment of segments) {
        total += segment.travelDurationMinutes ?? 0;
    }

    return total;
}

// T37 — Compute derived arrival times for each stop
export function computeDerivedArrivalTimes(
    stops: Stop[],
    segments: Segment[],
    startDatetime: Date | null
): (Date | null)[] {
    if (!startDatetime || stops.length === 0) {
        return stops.map(() => null);
    }

    const sorted = [...stops].sort((a, b) => a.orderIndex - b.orderIndex);
    const arrivalTimes: (Date | null)[] = [];

    let currentTime = new Date(startDatetime);

    for (let i = 0; i < sorted.length; i++) {
        arrivalTimes.push(new Date(currentTime));

        // Add stay duration at this stop
        currentTime = new Date(currentTime.getTime() + (sorted[i].stayDurationMinutes ?? 0) * 60000);

        // Add travel duration to next stop (find segment between this stop and next)
        if (i < sorted.length - 1) {
            const seg = segments.find(
                (s) => s.fromStopId === sorted[i].id && s.toStopId === sorted[i + 1].id
            );
            if (seg?.travelDurationMinutes) {
                currentTime = new Date(currentTime.getTime() + seg.travelDurationMinutes * 60000);
            }
        }
    }

    return arrivalTimes;
}

// Format duration in minutes to human-readable string
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Format distance in meters to human-readable string
export function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}
