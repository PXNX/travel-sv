// src/routes/(authorized)/api/trips/share/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { trips, tripShares, users } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

// GET - Get all users a trip is shared with
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const tripId = url.searchParams.get('tripId');

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
        throw error(403, 'Only the trip owner can view share settings');
    }

    // Get all shares for this trip
    const shares = await db
        .select({
            id: tripShares.id,
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            canEdit: tripShares.canEdit,
            createdAt: tripShares.createdAt
        })
        .from(tripShares)
        .innerJoin(users, eq(tripShares.sharedWithUserId, users.id))
        .where(eq(tripShares.tripId, id));

    return json(shares);
};

// POST - Share a trip with another user
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const data = await request.json();
    const { tripId, email, canEdit = false } = data;

    if (!tripId || !email) {
        throw error(400, 'Trip ID and user email are required');
    }

    // Check if user owns the trip
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));

    if (!trip) {
        throw error(404, 'Trip not found');
    }

    if (trip.userId !== locals.user.id) {
        throw error(403, 'Only the trip owner can share the trip');
    }

    // Find user by email
    const [targetUser] = await db.select().from(users).where(eq(users.email, email));

    if (!targetUser) {
        throw error(404, 'User not found with that email address');
    }

    // Don't allow sharing with self
    if (targetUser.id === locals.user.id) {
        throw error(400, 'You cannot share a trip with yourself');
    }

    // Check if already shared
    const [existingShare] = await db
        .select()
        .from(tripShares)
        .where(
            and(eq(tripShares.tripId, tripId), eq(tripShares.sharedWithUserId, targetUser.id))
        );

    if (existingShare) {
        // Update existing share
        const [updatedShare] = await db
            .update(tripShares)
            .set({ canEdit })
            .where(eq(tripShares.id, existingShare.id))
            .returning();

        return json({
            ...updatedShare,
            userName: targetUser.name,
            userEmail: targetUser.email
        });
    }

    // Create new share
    const [newShare] = await db
        .insert(tripShares)
        .values({
            tripId,
            sharedWithUserId: targetUser.id,
            sharedByUserId: locals.user.id,
            canEdit
        })
        .returning();

    return json(
        {
            ...newShare,
            userName: targetUser.name,
            userEmail: targetUser.email
        },
        { status: 201 }
    );
};

// DELETE - Remove a share
export const DELETE: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const shareId = url.searchParams.get('id');

    if (!shareId) {
        throw error(400, 'Share ID is required');
    }

    const id = parseInt(shareId);

    // Get the share to check permissions
    const [share] = await db
        .select({
            id: tripShares.id,
            tripId: tripShares.tripId,
            sharedWithUserId: tripShares.sharedWithUserId,
            ownerId: trips.userId
        })
        .from(tripShares)
        .innerJoin(trips, eq(tripShares.tripId, trips.id))
        .where(eq(tripShares.id, id));

    if (!share) {
        throw error(404, 'Share not found');
    }

    // Only trip owner or the user the trip was shared with can remove the share
    if (share.ownerId !== locals.user.id && share.sharedWithUserId !== locals.user.id) {
        throw error(403, 'You do not have permission to remove this share');
    }

    await db.delete(tripShares).where(eq(tripShares.id, id));

    return json({ success: true });
};
