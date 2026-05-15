import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { journeys, stops, segments, users } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
    const [journey] = await db
        .select()
        .from(journeys)
        .where(eq(journeys.shareToken, params.shareToken));

    if (!journey || !journey.isPublic) throw error(404, 'Journey not found');

    const [owner] = await db.select().from(users).where(eq(users.id, journey.ownerId));

    const journeyStops = await db
        .select()
        .from(stops)
        .where(eq(stops.journeyId, journey.id))
        .orderBy(asc(stops.orderIndex));

    const rawSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.journeyId, journey.id));

    const journeySegments = rawSegments.map((s) => ({
        ...s,
        transitLegs: s.transitLegs ? JSON.parse(s.transitLegs) : null,
        walkGeometry: s.walkGeometry ? JSON.parse(s.walkGeometry) : null,
        driveGeometry: s.driveGeometry ? JSON.parse(s.driveGeometry) : null,
        transitGeometry: s.transitGeometry ? JSON.parse(s.transitGeometry) : null
    }));

    return {
        journey: {
            ...journey,
            startDatetime: journey.startDatetime?.toISOString() ?? null,
            createdAt: journey.createdAt.toISOString(),
            updatedAt: journey.updatedAt.toISOString(),
            ownerName: owner?.displayName ?? 'Unknown'
        },
        stops: journeyStops,
        segments: journeySegments
    };
};

export const actions = {
    import: async ({ params, locals }) => {
        if (!locals.user) return fail(401, { error: 'Sign in to import' });

        // Find the source journey
        const [source] = await db
            .select()
            .from(journeys)
            .where(eq(journeys.shareToken, params.shareToken));

        if (!source || !source.isPublic) return fail(404, { error: 'Not found' });

        // Deep-copy journey
        const [newJourney] = await db
            .insert(journeys)
            .values({
                ownerId: locals.user.id,
                title: `${source.title} (Copy)`,
                description: source.description,
                startDatetime: source.startDatetime
            })
            .returning();

        // Deep-copy stops and build old→new stop ID mapping
        const sourceStops = await db
            .select()
            .from(stops)
            .where(eq(stops.journeyId, source.id))
            .orderBy(asc(stops.orderIndex));

        const stopIdMap = new Map<number, number>();
        for (const s of sourceStops) {
            const [newStop] = await db.insert(stops).values({
                journeyId: newJourney.id,
                name: s.name,
                lat: s.lat,
                lon: s.lon,
                orderIndex: s.orderIndex,
                stayDurationMinutes: s.stayDurationMinutes,
                notes: s.notes
            }).returning();
            stopIdMap.set(s.id, newStop.id);
        }

        // Deep-copy segments (preserves transit selections, geometry, etc.)
        const sourceSegments = await db
            .select()
            .from(segments)
            .where(eq(segments.journeyId, source.id));

        for (const seg of sourceSegments) {
            const newFromId = stopIdMap.get(seg.fromStopId);
            const newToId = stopIdMap.get(seg.toStopId);
            if (newFromId === undefined || newToId === undefined) continue;

            await db.insert(segments).values({
                journeyId: newJourney.id,
                fromStopId: newFromId,
                toStopId: newToId,
                mode: seg.mode,
                distanceM: seg.distanceM,
                elevationUpM: seg.elevationUpM,
                elevationDownM: seg.elevationDownM,
                travelDurationMinutes: seg.travelDurationMinutes,
                transitSummary: seg.transitSummary,
                transitLegs: seg.transitLegs,
                walkToStationMin: seg.walkToStationMin,
                walkFromStationMin: seg.walkFromStationMin,
                transfers: seg.transfers,
                walkGeometry: seg.walkGeometry,
                driveGeometry: seg.driveGeometry,
                transitGeometry: seg.transitGeometry
            });
        }

        redirect(303, `/journeys/${newJourney.id}`);
    }
} satisfies Actions;
