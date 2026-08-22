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

    it('transit: HAFAS journeys with coordinates → legs + transfers + walk times', async () => {
        // HAFAS /journeys with coordinates (API resolves nearest stops internally)
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
		const r = await computeSegment(stopA, stopB, 1, 'transit', 8);

		expect(r.transitSummary).toBe('S 8');
        expect(r.transfers).toBe(0);
        expect(r.walkToStationMin).toBe(8);
        expect(r.walkFromStationMin).toBe(5);
        expect(r.transitLegs).toHaveLength(3);
        expect(r.transitLegs![0].type).toBe('walking');
        expect(r.transitLegs![1].type).toBe('transport');
		expect(r.transitLegs![1].lineName).toBe('S 8');
        expect(r.transitLegs![1].platform).toBe('3');
        expect(r.transitLegs![1].direction).toBe('Wiesbaden Hbf');
        expect(r.travelDurationMinutes).toBe(40); // 08:50 → 09:30
		expect(r.elevationUpM).toBe(0);
		expect(mockFetch.mock.calls[0][0]).toContain('from.latitude=50');
		expect(mockFetch.mock.calls[0][0]).toContain('transferTime=8');
	});

	it('transit: ignores walking-only results and selects a confirmed vehicle journey', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				journeys: [
					{ legs: [{ walking: true, departure: '2024-01-01T08:00:00+01:00', arrival: '2024-01-01T08:10:00+01:00' }] },
					{ legs: [{ line: { productName: 'Bus', name: '55' }, departure: '2024-01-01T08:02:00+01:00', arrival: '2024-01-01T08:20:00+01:00', origin: { name: 'Bus stop' }, destination: { name: 'Destination' } }] }
				]
			})
		});

		const { computeSegment } = await import('./computeSegment');
		const r = await computeSegment(stopA, stopB, 1, 'transit');

		expect(r.transitSummary).toBe('Bus 55');
		expect(r.transitLegs).toHaveLength(1);
		expect(r.transitLegs![0].type).toBe('transport');
		expect(r.transfers).toBe(0);
	});

	it('transit: accepts a timed HAFAS vehicle leg even without an optional line object', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				journeys: [{ legs: [{ tripId: '1|confirmed-trip', direction: 'Hauptbahnhof', departure: '2024-01-01T08:02:00+01:00', arrival: '2024-01-01T08:20:00+01:00', origin: { name: 'Start' }, destination: { name: 'Ende' } }] }]
			})
		});

		const { computeSegment } = await import('./computeSegment');
		const r = await computeSegment(stopA, stopB, 1, 'transit');

		expect(r.transitLegs).toHaveLength(1);
		expect(r.transitLegs![0].type).toBe('transport');
		expect(r.transitSummary).toBe('ÖPNV');
		expect(r.transfers).toBe(0);
	});

	it('transit: rejects an explicitly unknown OTHER mode as an unconfirmed vehicle', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ journeys: [{ legs: [{ product: 'OTHER', tripId: 'unknown', direction: 'Ravensburg Polizeipräsidium', departure: '2024-01-01T08:02:00+01:00', arrival: '2024-01-01T08:20:00+01:00' }] }] })
		});

		const { computeSegment } = await import('./computeSegment');
		const r = await computeSegment(stopA, stopB, 1, 'transit');

		expect(r.transitLegs).toBeNull();
		expect(r.transitSummary).toBeNull();
	});

	it('transit: stores no estimated direct connection when HAFAS returns no vehicle leg', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ journeys: [{ legs: [{ walking: true, departure: '2024-01-01T08:00:00+01:00', arrival: '2024-01-01T08:10:00+01:00' }] }] })
		});

		const { computeSegment } = await import('./computeSegment');
		const r = await computeSegment(stopA, stopB, 1, 'transit');

		expect(r.transitSummary).toBeNull();
		expect(r.transitLegs).toBeNull();
		expect(r.transfers).toBeNull();
		expect(r.travelDurationMinutes).toBe(0);
	});

	it('transit: keeps an existing connection safe when an alternative has no confirmed vehicle', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ journeys: [{ legs: [{ walking: true, departure: '2024-01-01T08:00:00+01:00', arrival: '2024-01-01T08:10:00+01:00' }] }] })
		});

		const { computeSegment, NoConfirmedTransitError } = await import('./computeSegment');
		await expect(computeSegment(stopA, stopB, 1, 'transit', 5, true, { requireConfirmed: true })).rejects.toBeInstanceOf(NoConfirmedTransitError);
	});

	it('transit: uses Transitous when DB Transport REST fails', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('unavailable') });
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				itineraries: [{
					duration: 1200,
					transfers: 0,
					endTime: '2026-08-22T10:20:00Z',
					legs: [
						{ mode: 'WALK', duration: 180, startTime: '2026-08-22T10:00:00Z', endTime: '2026-08-22T10:03:00Z', from: { name: 'Start', lat: 50, lon: 8 }, to: { name: 'Station', lat: 50.001, lon: 8.001 } },
						{ mode: 'BUS', duration: 900, startTime: '2026-08-22T10:03:00Z', endTime: '2026-08-22T10:18:00Z', routeShortName: '55', headsign: 'Zentrum', from: { name: 'Station', lat: 50.001, lon: 8.001 }, to: { name: 'Ziel', lat: 50.01, lon: 8.01 } },
						{ mode: 'WALK', duration: 120, startTime: '2026-08-22T10:18:00Z', endTime: '2026-08-22T10:20:00Z', from: { name: 'Ziel', lat: 50.01, lon: 8.01 }, to: { name: 'Ende', lat: 50.01, lon: 8.01 } }
					]
				}]
			})
		});

		const { computeSegment } = await import('./computeSegment');
		const r = await computeSegment(stopA, stopB, 1, 'transit', 7);

		expect(mockFetch.mock.calls[1][0]).toContain('api.transitous.org/api/v6/plan');
		expect(mockFetch.mock.calls[1][0]).toContain('minTransferTime=7');
		expect(r.transitSummary).toBe('55');
		expect(r.travelDurationMinutes).toBe(20);
		expect(r.walkToStationMin).toBe(3);
		expect(r.walkFromStationMin).toBe(2);
		expect(r.transitLegs).toHaveLength(3);
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
