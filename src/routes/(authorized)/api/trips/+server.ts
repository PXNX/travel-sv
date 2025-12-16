// src/routes/(authorized)/api/trips/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { trips, tripLocations, tripShares, users } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';

// GET - Fetch all trips accessible by the current user
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    // Get trips owned by the user
    const ownedTrips = await db
        .select({
            id: trips.id,
            userId: trips.userId,
            name: trips.name,
            description: trips.description,
            startDate: trips.startDate,
            endDate: trips.endDate,
            createdAt: trips.createdAt,
            isOwner: true,
            canEdit: true,
            sharedBy: null as string | null
        })
        .from(trips)
        .where(eq(trips.userId, locals.user.id));

    // Get trips shared with the user
    const sharedTrips = await db
        .select({
            id: trips.id,
            userId: trips.userId,
            name: trips.name,
            description: trips.description,
            startDate: trips.startDate,
            endDate: trips.endDate,
            createdAt: trips.createdAt,
            isOwner: false,
            canEdit: tripShares.canEdit,
            sharedBy: users.name
        })
        .from(tripShares)
        .innerJoin(trips, eq(tripShares.tripId, trips.id))
        .innerJoin(users, eq(tripShares.sharedByUserId, users.id))
        .where(eq(tripShares.sharedWithUserId, locals.user.id));

    // Get trip locations for all trips
    const allTripIds = [...ownedTrips, ...sharedTrips].map((t) => t.id);

    const locations = allTripIds.length > 0
        ? await db
            .select()
            .from(tripLocations)
            .where(or(...allTripIds.map((id) => eq(tripLocations.tripId, id))))
        : [];

    // Combine and format the trips with their locations
    const allTrips = [...ownedTrips, ...sharedTrips].map((trip) => ({
        ...trip,
        locations: locations
            .filter((loc) => loc.tripId === trip.id)
            .sort((a, b) => a.order - b.order)
    }));

    return json(allTrips);
};

// POST - Create a new trip
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const data = await request.json();
    const { name, description, startDate, endDate } = data;

    if (!name) {
        throw error(400, 'Trip name is required');
    }

    const [newTrip] = await db
        .insert(trips)
        .values({
            userId: locals.user.id,
            name,
            description: description || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        })
        .returning();

    return json(newTrip, { status: 201 });
};

// PUT - Update a trip
export const PUT: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const data = await request.json();
    const { id, name, description, startDate, endDate } = data;

    if (!id) {
        throw error(400, 'Trip ID is required');
    }

    // Check if user owns the trip or has edit access
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));

    if (!trip) {
        throw error(404, 'Trip not found');
    }

    let canEdit = trip.userId === locals.user.id;

    if (!canEdit) {
        // Check if user has edit permission through sharing
        const [share] = await db
            .select()
            .from(tripShares)
            .where(
                and(
                    eq(tripShares.tripId, id),
                    eq(tripShares.sharedWithUserId, locals.user.id),
                    eq(tripShares.canEdit, true)
                )
            );

        canEdit = !!share;
    }

    if (!canEdit) {
        throw error(403, 'You do not have permission to edit this trip');
    }

    const [updatedTrip] = await db
        .update(trips)
        .set({
            name: name || trip.name,
            description: description !== undefined ? description : trip.description,
            startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : trip.startDate,
            endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : trip.endDate
        })
        .where(eq(trips.id, id))
        .returning();

    return json(updatedTrip);
};

// DELETE - Delete a trip
export const DELETE: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('id');

    if (!tripId) {
        throw error(400, 'Trip ID is required');
    }

    const id = parseInt(tripId);

    // Check if user owns the trip
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));

    if (!trip) {
        throw error(404, 'Trip not found');
    }

    if (trip.userId !== locals.user.id) {
        throw error(403, 'Only the trip owner can delete the trip');
    }

    await db.delete(trips).where(eq(trips.id, id));

    return json({ success: true });
};
