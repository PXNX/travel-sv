import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { journeys, stops, segments } from '$lib/server/schema';
import { eq, and, asc } from 'drizzle-orm';
import { recomputeSegments } from '$lib/server/recomputeSegments';
import { computeSegment } from '$lib/server/computeSegment';
import type { SegmentMode, Stop } from '$lib/types';

// ── helpers ─────────────────────────────────────────────────────────
function journeyId(params: { id: string }) {
    const id = parseInt(params.id);
    if (isNaN(id)) throw error(400, 'Invalid journey ID');
    return id;
}

async function ownedJourney(id: number, userId: string) {
    const [j] = await db
        .select()
        .from(journeys)
        .where(and(eq(journeys.id, id), eq(journeys.ownerId, userId)));
    if (!j) throw error(404, 'Journey not found');
    return j;
}

function fd(form: FormData, key: string): string {
    return (form.get(key) as string) ?? '';
}

async function fullPayload(id: number) {
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    const journeyStops = await db
        .select()
        .from(stops)
        .where(eq(stops.journeyId, id))
        .orderBy(asc(stops.orderIndex));
    const rawSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.journeyId, id));

    // Deserialize JSON text columns into real objects
    const journeySegments = rawSegments.map((s) => ({
        ...s,
        transitLegs: s.transitLegs ? JSON.parse(s.transitLegs) : null,
        walkGeometry: s.walkGeometry ? JSON.parse(s.walkGeometry) : null,
        driveGeometry: s.driveGeometry ? JSON.parse(s.driveGeometry) : null
    }));

    return {
        journey: {
            ...journey,
            startDatetime: journey.startDatetime?.toISOString() ?? null,
            createdAt: journey.createdAt.toISOString(),
            updatedAt: journey.updatedAt.toISOString()
        },
        stops: journeyStops,
        segments: journeySegments
    };
}

// ── load ────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ params, locals }) => {
    const id = journeyId(params);
    await ownedJourney(id, locals.user!.id);
    const payload = await fullPayload(id);
    return { ...payload, user: locals.user };
};

// ── actions ─────────────────────────────────────────────────────────
export const actions = {
    /* ── journey fields ───────────────────────────────────────────── */
    updateJourney: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (form.has('title')) updates.title = fd(form, 'title');
        if (form.has('description')) updates.description = fd(form, 'description') || null;
        if (form.has('startDatetime')) {
            const v = fd(form, 'startDatetime');
            updates.startDatetime = v ? new Date(v) : null;
        }

        await db.update(journeys).set(updates).where(eq(journeys.id, id));
        return await fullPayload(id);
    },

    /* ── add stop ─────────────────────────────────────────────────── */
    addStop: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();

        const name = fd(form, 'name');
        const lat = parseFloat(fd(form, 'lat'));
        const lon = parseFloat(fd(form, 'lon'));
        if (!name || isNaN(lat) || isNaN(lon)) return fail(400, { error: 'name/lat/lon required' });

        let orderIndex = form.has('orderIndex') ? parseInt(fd(form, 'orderIndex')) : undefined;

        if (orderIndex !== undefined && !isNaN(orderIndex)) {
            // shift subsequent stops
            const toShift = await db
                .select()
                .from(stops)
                .where(eq(stops.journeyId, id));
            for (const s of toShift.filter((s) => s.orderIndex >= orderIndex!)) {
                await db.update(stops).set({ orderIndex: s.orderIndex + 1 }).where(eq(stops.id, s.id));
            }
        } else {
            const existing = await db
                .select()
                .from(stops)
                .where(eq(stops.journeyId, id))
                .orderBy(asc(stops.orderIndex));
            orderIndex = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 0;
        }

        await db.insert(stops).values({
            journeyId: id,
            name,
            lat,
            lon,
            orderIndex,
            stayDurationMinutes: parseInt(fd(form, 'stayDurationMinutes') || '60') || 60,
            notes: fd(form, 'notes') || null
        });

        await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
        await recomputeSegments(id);
        return await fullPayload(id);
    },

    /* ── update stop ──────────────────────────────────────────────── */
    updateStop: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();
        const stopId = parseInt(fd(form, 'stopId'));
        if (isNaN(stopId)) return fail(400, { error: 'stopId required' });

        const updates: Record<string, unknown> = {};
        if (form.has('name')) updates.name = fd(form, 'name');
        if (form.has('lat')) updates.lat = parseFloat(fd(form, 'lat'));
        if (form.has('lon')) updates.lon = parseFloat(fd(form, 'lon'));
        if (form.has('stayDurationMinutes'))
            updates.stayDurationMinutes = parseInt(fd(form, 'stayDurationMinutes'));
        if (form.has('notes')) updates.notes = fd(form, 'notes') || null;

        await db
            .update(stops)
            .set(updates)
            .where(and(eq(stops.id, stopId), eq(stops.journeyId, id)));

        await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));

        const locationChanged = form.has('lat') || form.has('lon');
        if (locationChanged) await recomputeSegments(id);

        return await fullPayload(id);
    },

    /* ── delete stop ──────────────────────────────────────────────── */
    deleteStop: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();
        const stopId = parseInt(fd(form, 'stopId'));

        await db.delete(stops).where(and(eq(stops.id, stopId), eq(stops.journeyId, id)));
        await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
        await recomputeSegments(id);
        return await fullPayload(id);
    },

    /* ── reorder stops ────────────────────────────────────────────── */
    reorderStops: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();
        const stopIds: number[] = JSON.parse(fd(form, 'stopIds'));

        await Promise.all(
            stopIds.map((sid, idx) =>
                db
                    .update(stops)
                    .set({ orderIndex: idx })
                    .where(and(eq(stops.id, sid), eq(stops.journeyId, id)))
            )
        );

        await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
        await recomputeSegments(id);
        return await fullPayload(id);
    },

    /* ── change segment mode (walk / transit / drive) ─────────────── */
    changeSegmentMode: async ({ params, request, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const form = await request.formData();
        const segmentId = parseInt(fd(form, 'segmentId'));
        const mode = fd(form, 'mode') as SegmentMode;

        if (!['walk', 'transit', 'drive'].includes(mode))
            return fail(400, { error: 'invalid mode' });

        const [seg] = await db
            .select()
            .from(segments)
            .where(and(eq(segments.id, segmentId), eq(segments.journeyId, id)));
        if (!seg) return fail(404, { error: 'segment not found' });

        // Fetch the two stops this segment connects
        const [fromStop] = await db.select().from(stops).where(eq(stops.id, seg.fromStopId));
        const [toStop] = await db.select().from(stops).where(eq(stops.id, seg.toStopId));

        if (fromStop && toStop) {
            await computeSegment(fromStop as Stop, toStop as Stop, id, mode);
        }

        return await fullPayload(id);
    },

    /* ── publish / unpublish ──────────────────────────────────────── */
    publish: async ({ params, locals, url }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);
        const shareToken = crypto.randomUUID();

        await db
            .update(journeys)
            .set({ isPublic: true, shareToken, updatedAt: new Date() })
            .where(eq(journeys.id, id));

        const payload = await fullPayload(id);
        return { ...payload, shareUrl: `${url.origin}/j/${shareToken}` };
    },

    unpublish: async ({ params, locals }) => {
        const id = journeyId(params);
        await ownedJourney(id, locals.user!.id);

        await db
            .update(journeys)
            .set({ isPublic: false, shareToken: null, updatedAt: new Date() })
            .where(eq(journeys.id, id));

        return await fullPayload(id);
    }
} satisfies Actions;
