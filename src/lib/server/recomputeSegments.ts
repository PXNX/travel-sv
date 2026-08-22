import { db } from './db';
import { journeys, stops, segments } from './schema';
import { eq, and, asc } from 'drizzle-orm';
import { computeSegment } from './computeSegment';
import type { Stop, SegmentMode } from '$lib/types';

/**
 * Recompute all segments for a journey after stop add/update/delete/reorder.
 * Preserves the user-chosen mode for each stop-pair that already had a segment.
 */
export async function recomputeSegments(journeyId: number) {
	const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
	const minimumTransferMinutes = journey?.minimumTransferMinutes ?? 5;
	const deutschlandticketOnly = journey?.deutschlandticketOnly ?? true;
    const orderedStops = await db
        .select()
        .from(stops)
        .where(eq(stops.journeyId, journeyId))
        .orderBy(asc(stops.orderIndex));

    if (orderedStops.length < 2) {
        await db.delete(segments).where(eq(segments.journeyId, journeyId));
        return [] as (typeof segments.$inferSelect)[];
    }

    // Remember existing modes so the user's choice survives a recompute
    const existingSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.journeyId, journeyId));

    const modeByPair = new Map<string, SegmentMode>();
    for (const seg of existingSegments) {
        modeByPair.set(`${seg.fromStopId}-${seg.toStopId}`, seg.mode as SegmentMode);
    }

	const activePairs = new Set<string>();

	// Compute fresh segments for every adjacent pair. Existing segments remain in place until
	// a confirmed replacement succeeds, so an unavailable transit provider cannot erase a route.
	for (let i = 0; i < orderedStops.length - 1; i++) {
		const from = orderedStops[i] as Stop;
		const to = orderedStops[i + 1] as Stop;
		const mode = modeByPair.get(`${from.id}-${to.id}`) ?? 'walk';
		activePairs.add(`${from.id}-${to.id}`);

		try {
			await computeSegment(from, to, journeyId, mode, minimumTransferMinutes, deutschlandticketOnly, mode === 'transit' ? { requireConfirmed: true } : {});
		} catch (err) {
			console.error(`Segment ${from.id}→${to.id} failed:`, err);
		}
	}

	for (const segment of existingSegments) {
		if (!activePairs.has(`${segment.fromStopId}-${segment.toStopId}`)) {
			await db.delete(segments).where(eq(segments.id, segment.id));
		}
	}

    return db.select().from(segments).where(eq(segments.journeyId, journeyId));
}
