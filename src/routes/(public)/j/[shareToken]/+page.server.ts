import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { journeys, stops, segments, users } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';
import { recomputeSegments } from '$lib/server/recomputeSegments';

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

    const journeySegments = await db
        .select()
        .from(segments)
        .where(eq(segments.journeyId, journey.id));

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

        // Deep-copy stops
        const sourceStops = await db
            .select()
            .from(stops)
            .where(eq(stops.journeyId, source.id))
            .orderBy(asc(stops.orderIndex));

        for (const s of sourceStops) {
            await db.insert(stops).values({
                journeyId: newJourney.id,
                name: s.name,
                lat: s.lat,
                lon: s.lon,
                orderIndex: s.orderIndex,
                stayDurationMinutes: s.stayDurationMinutes,
                notes: s.notes
            });
        }

        // Compute segments for the copy
        await recomputeSegments(newJourney.id);

        redirect(303, `/journeys/${newJourney.id}`);
    }
} satisfies Actions;
