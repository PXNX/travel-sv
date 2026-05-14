import { describe, it, expect } from 'vitest';
import { computeTotalDuration, computeDerivedArrivalTimes, formatDuration, formatDistance } from './helpers';
import type { Stop, Segment } from './types';

// T23 — Unit test: computeTotalDuration
describe('computeTotalDuration', () => {
    it('returns 0 for empty arrays', () => {
        expect(computeTotalDuration([], [])).toBe(0);
    });

    it('sums stop stay durations only', () => {
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null },
            { id: 2, journeyId: 1, name: 'B', lat: 1, lon: 1, orderIndex: 1, stayDurationMinutes: 60, notes: null }
        ];
        expect(computeTotalDuration(stops, [])).toBe(90);
    });

    it('sums segment travel durations only', () => {
        const segments: Segment[] = [
            { id: 1, journeyId: 1, fromStopId: 1, toStopId: 2, distanceM: 5000, elevationUpM: 50, elevationDownM: 20, travelDurationMinutes: 45, mode: 'walk' }
        ];
        expect(computeTotalDuration([], segments)).toBe(45);
    });

    it('sums both stay and travel durations', () => {
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null },
            { id: 2, journeyId: 1, name: 'B', lat: 1, lon: 1, orderIndex: 1, stayDurationMinutes: 60, notes: null }
        ];
        const segments: Segment[] = [
            { id: 1, journeyId: 1, fromStopId: 1, toStopId: 2, distanceM: 5000, elevationUpM: 50, elevationDownM: 20, travelDurationMinutes: 45, mode: 'walk' }
        ];
        expect(computeTotalDuration(stops, segments)).toBe(135);
    });

    it('handles null durations gracefully', () => {
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: null, notes: null },
            { id: 2, journeyId: 1, name: 'B', lat: 1, lon: 1, orderIndex: 1, stayDurationMinutes: 30, notes: null }
        ];
        const segments: Segment[] = [
            { id: 1, journeyId: 1, fromStopId: 1, toStopId: 2, distanceM: null, elevationUpM: null, elevationDownM: null, travelDurationMinutes: null, mode: 'walk' }
        ];
        expect(computeTotalDuration(stops, segments)).toBe(30);
    });
});

// T37 — Unit test: computeDerivedArrivalTimes
describe('computeDerivedArrivalTimes', () => {
    it('returns array of nulls when startDatetime is null', () => {
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null }
        ];
        const result = computeDerivedArrivalTimes(stops, [], null);
        expect(result).toEqual([null]);
    });

    it('returns empty array for empty stops', () => {
        const result = computeDerivedArrivalTimes([], [], new Date('2024-01-01T09:00:00'));
        expect(result).toEqual([]);
    });

    it('first stop arrival equals start datetime', () => {
        const start = new Date('2024-01-01T09:00:00');
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null }
        ];
        const result = computeDerivedArrivalTimes(stops, [], start);
        expect(result[0]?.getTime()).toBe(start.getTime());
    });

    it('computes arrival times with stay and travel durations', () => {
        const start = new Date('2024-01-01T09:00:00');
        const stops: Stop[] = [
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null },
            { id: 2, journeyId: 1, name: 'B', lat: 1, lon: 1, orderIndex: 1, stayDurationMinutes: 60, notes: null },
            { id: 3, journeyId: 1, name: 'C', lat: 2, lon: 2, orderIndex: 2, stayDurationMinutes: 15, notes: null }
        ];
        const segments: Segment[] = [
            { id: 1, journeyId: 1, fromStopId: 1, toStopId: 2, distanceM: 5000, elevationUpM: 50, elevationDownM: 20, travelDurationMinutes: 45, mode: 'walk' },
            { id: 2, journeyId: 1, fromStopId: 2, toStopId: 3, distanceM: 3000, elevationUpM: 10, elevationDownM: 30, travelDurationMinutes: 30, mode: 'walk' }
        ];

        const result = computeDerivedArrivalTimes(stops, segments, start);

        // Stop A: arrival at 09:00
        expect(result[0]?.toISOString()).toBe(start.toISOString());

        // Stop B: 09:00 + 30min stay + 45min travel = 10:15
        expect(result[1]?.getHours()).toBe(10);
        expect(result[1]?.getMinutes()).toBe(15);

        // Stop C: 10:15 + 60min stay + 30min travel = 11:45
        expect(result[2]?.getHours()).toBe(11);
        expect(result[2]?.getMinutes()).toBe(45);
    });

    it('sorts stops by orderIndex', () => {
        const start = new Date('2024-01-01T09:00:00');
        const stops: Stop[] = [
            { id: 2, journeyId: 1, name: 'B', lat: 1, lon: 1, orderIndex: 1, stayDurationMinutes: 60, notes: null },
            { id: 1, journeyId: 1, name: 'A', lat: 0, lon: 0, orderIndex: 0, stayDurationMinutes: 30, notes: null }
        ];

        const result = computeDerivedArrivalTimes(stops, [], start);
        expect(result[0]?.getTime()).toBe(start.getTime());
    });
});

describe('formatDuration', () => {
    it('formats minutes under 60', () => {
        expect(formatDuration(45)).toBe('45 min');
    });

    it('formats hours only', () => {
        expect(formatDuration(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
        expect(formatDuration(150)).toBe('2h 30min');
    });
});

describe('formatDistance', () => {
    it('formats meters under 1000', () => {
        expect(formatDistance(500)).toBe('500 m');
    });

    it('formats kilometers', () => {
        expect(formatDistance(3200)).toBe('3.2 km');
    });
});
