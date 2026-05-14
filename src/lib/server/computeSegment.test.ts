import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('./db', () => ({
    db: {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) })
            })
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) })
    }
}));
vi.mock('./schema', () => ({ segments: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));

const stopA = { id: 1, journeyId: 1, name: 'A', lat: 50.0, lon: 8.0, orderIndex: 0, stayDurationMinutes: 30, notes: null };
const stopB = { id: 2, journeyId: 1, name: 'B', lat: 50.01, lon: 8.01, orderIndex: 1, stayDurationMinutes: 60, notes: null };

describe('computeSegment', () => {
    beforeEach(() => { mockFetch.mockReset(); });

    it('walk: OSRM foot geometry + elevation', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                code: 'Ok',
                routes: [{ distance: 3200, duration: 2400, geometry: { coordinates: [[8.0, 50.0], [8.005, 50.005], [8.01, 50.01]] } }]
            })
        });
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ results: [{ elevation: 100 }, { elevation: 150 }] })
        });

        const { computeSegment } = await import('./computeSegment');
        const r = await computeSegment(stopA, stopB, 1, 'walk');

        expect(r.distanceM).toBe(3200);
        expect(r.travelDurationMinutes).toBe(40);
        expect(r.elevationUpM).toBe(50);
        expect(r.walkGeometry).toHaveLength(3);
        expect(r.transitLegs).toBeNull();
    });

    it('drive: OSRM car with geometry, no elevation', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                code: 'Ok',
                routes: [{ distance: 5000, duration: 300, geometry: { coordinates: [[8.0, 50.0], [8.01, 50.01]] } }]
            })
        });

        const { computeSegment } = await import('./computeSegment');
        const r = await computeSegment(stopA, stopB, 1, 'drive');

        expect(r.distanceM).toBe(5000);
        expect(r.travelDurationMinutes).toBe(5);
        expect(r.elevationUpM).toBe(0);
        expect(r.walkGeometry).toBeNull();
        expect(r.driveGeometry).toHaveLength(2);
        expect(r.driveGeometry![0]).toEqual([50.0, 8.0]);
    });

    it('transit: findNearestStop → HAFAS journeys → legs + transfers + walk times', async () => {
        // 1. findNearestStop for stopA
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                { id: '8000105', name: 'Frankfurt Hbf', location: { latitude: 50.107, longitude: 8.663 } }
            ])
        });
        // 2. findNearestStop for stopB
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                { id: '8000244', name: 'Mainz Hbf', location: { latitude: 50.001, longitude: 8.259 } }
            ])
        });
        // 3. HAFAS /journeys with station IDs
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                journeys: [{
                    legs: [
                        {
                            walking: true,
                            departure: '2024-01-01T08:50:00+01:00',
                            arrival: '2024-01-01T08:58:00+01:00',
                            origin: { name: 'My Place' },
                            destination: { name: 'Frankfurt Hbf' }
                        },
                        {
                            line: { productName: 'S', name: '8' },
                            direction: 'Wiesbaden Hbf',
                            departure: '2024-01-01T09:00:00+01:00',
                            arrival: '2024-01-01T09:25:00+01:00',
                            origin: { name: 'Frankfurt Hbf' },
                            destination: { name: 'Mainz Hbf' },
                            departurePlatform: '3'
                        },
                        {
                            walking: true,
                            departure: '2024-01-01T09:25:00+01:00',
                            arrival: '2024-01-01T09:30:00+01:00',
                            origin: { name: 'Mainz Hbf' },
                            destination: { name: 'Destination' }
                        }
                    ]
                }]
            })
        });

        const { computeSegment } = await import('./computeSegment');
        const r = await computeSegment(stopA, stopB, 1, 'transit');

        expect(r.transitSummary).toBe('S 8');
        expect(r.transfers).toBe(0);
        expect(r.walkToStationMin).toBe(8);
        expect(r.walkFromStationMin).toBe(5);
        expect(r.transitLegs).toHaveLength(3);
        expect(r.transitLegs![0].type).toBe('walking');
        expect(r.transitLegs![1].type).toBe('transport');
        expect(r.transitLegs![1].lineName).toBe('8');
        expect(r.transitLegs![1].platform).toBe('3');
        expect(r.transitLegs![1].direction).toBe('Wiesbaden Hbf');
        expect(r.travelDurationMinutes).toBe(40); // 08:50 → 09:30
        expect(r.elevationUpM).toBe(0);
    });

    it('fallback when all APIs fail', async () => {
        mockFetch.mockRejectedValue(new Error('Offline'));

        const { computeSegment } = await import('./computeSegment');
        const r = await computeSegment(stopA, stopB, 1, 'walk');

        expect(r.distanceM).toBeGreaterThan(0);
        expect(r.travelDurationMinutes).toBeGreaterThan(0);
        expect(r.walkGeometry).toHaveLength(2);
    });
});
