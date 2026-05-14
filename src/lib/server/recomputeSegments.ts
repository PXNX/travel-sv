import { db } from './db';
import { stops, segments } from './schema';
import { eq, and, asc } from 'drizzle-orm';
import { computeSegment } from './computeSegment';
import type { Stop, SegmentMode } from '$lib/types';

/**
 * Recompute all segments for a journey after stop add/update/delete/reorder.
 * Preserves the user-chosen mode for each stop-pair that already had a segment.
 */
export async function recomputeSegments(journeyId: number) {
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

    // Delete old segments
    await db.delete(segments).where(eq(segments.journeyId, journeyId));

    // Compute fresh segments for every adjacent pair
    for (let i = 0; i < orderedStops.length - 1; i++) {
        const from = orderedStops[i] as Stop;
        const to = orderedStops[i + 1] as Stop;
        const mode = modeByPair.get(`${from.id}-${to.id}`) ?? 'walk';

        try {
            await computeSegment(from, to, journeyId, mode);
        } catch (err) {
            console.error(`Segment ${from.id}→${to.id} failed:`, err);
        }
    }

    return db.select().from(segments).where(eq(segments.journeyId, journeyId));
}
