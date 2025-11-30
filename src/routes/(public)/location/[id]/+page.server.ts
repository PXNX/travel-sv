// src/routes/location/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { travelTips, users, trips, tripLocations, tipLikes } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const locationId = parseInt(params.id);

	if (isNaN(locationId)) {
		throw error(400, 'Invalid location ID');
	}

	// Fetch the location with user info
	const [location] = await db
		.select({
			id: travelTips.id,
			userId: travelTips.userId,
			title: travelTips.title,
			description: travelTips.description,
			latitude: travelTips.latitude,
			longitude: travelTips.longitude,
			address: travelTips.address,
			category: travelTips.category,
			durationMinutes: travelTips.durationMinutes,
			bestTimeToVisit: travelTips.bestTimeToVisit,
			googleMapsUrl: travelTips.googleMapsUrl,
			tags: travelTips.tags,
			imageUrl: travelTips.imageUrl,
			createdAt: travelTips.createdAt,
			updatedAt: travelTips.updatedAt,
			userName: users.name,
			likes: sql<number>`(
				SELECT COUNT(*)::int 
				FROM ${tipLikes} 
				WHERE ${tipLikes.tipId} = ${travelTips.id}
			)`
		})
		.from(travelTips)
		.leftJoin(users, eq(travelTips.userId, users.id))
		.where(eq(travelTips.id, locationId));

	if (!location) {
		throw error(404, 'Location not found');
	}

	// Parse tags if they exist
	const parsedLocation = {
		...location,
		tags: location.tags ? JSON.parse(location.tags) : [],
		likes: location.likes || 0
	};

	// If user is signed in, fetch their trips and check which ones contain this location
	let userTrips: Array<{
		id: number;
		name: string;
		locationCount: number;
		hasLocation: boolean;
	}> = [];

	if (locals.user) {
		const userTripsData = await db
			.select({
				id: trips.id,
				name: trips.name,
				locationCount: sql<number>`(
					SELECT COUNT(*)::int 
					FROM ${tripLocations} 
					WHERE ${tripLocations.tripId} = ${trips.id}
				)`,
				hasLocation: sql<boolean>`EXISTS(
					SELECT 1 
					FROM ${tripLocations} 
					WHERE ${tripLocations.tripId} = ${trips.id} 
					AND ${tripLocations.locationId} = ${locationId}
				)`
			})
			.from(trips)
			.where(eq(trips.userId, locals.user.id));

		userTrips = userTripsData.map((trip) => ({
			id: trip.id,
			name: trip.name,
			locationCount: trip.locationCount || 0,
			hasLocation: trip.hasLocation || false
		}));
	}

	return {
		location: parsedLocation,
		userTrips,
		isSignedIn: !!locals.user
	};
};

export const actions: Actions = {
	like: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to like locations' });
		}

		const locationId = parseInt(params.id);

		try {
			// Check if already liked
			const existing = await db
				.select()
				.from(tipLikes)
				.where(and(eq(tipLikes.userId, locals.user.id), eq(tipLikes.tipId, locationId)))
				.limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'You already liked this location' });
			}

			// Add like
			await db.insert(tipLikes).values({
				userId: locals.user.id,
				tipId: locationId
			});

			return { success: true };
		} catch (err) {
			console.error('Error liking location:', err);
			return fail(500, { error: 'Failed to like location' });
		}
	},

	unlike: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to unlike locations' });
		}

		const locationId = parseInt(params.id);

		try {
			await db
				.delete(tipLikes)
				.where(and(eq(tipLikes.userId, locals.user.id), eq(tipLikes.tipId, locationId)));

			return { success: true };
		} catch (err) {
			console.error('Error unliking location:', err);
			return fail(500, { error: 'Failed to unlike location' });
		}
	},

	addToTrip: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in' });
		}

		const formData = await request.formData();
		const tripId = parseInt(formData.get('tripId')?.toString() || '0');
		const locationId = parseInt(formData.get('locationId')?.toString() || '0');

		if (!tripId || !locationId) {
			return fail(400, { error: 'Invalid trip or location ID' });
		}

		try {
			// Verify the trip belongs to the user
			const [trip] = await db
				.select()
				.from(trips)
				.where(and(eq(trips.id, tripId), eq(trips.userId, locals.user.id)))
				.limit(1);

			if (!trip) {
				return fail(403, { error: 'Trip not found or access denied' });
			}

			// Check if location is already in the trip
			const existing = await db
				.select()
				.from(tripLocations)
				.where(and(eq(tripLocations.tripId, tripId), eq(tripLocations.locationId, locationId)))
				.limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'Location already in trip' });
			}

			// Get the current max order for this trip
			const [maxOrder] = await db
				.select({ max: sql<number>`COALESCE(MAX(${tripLocations.order}), 0)` })
				.from(tripLocations)
				.where(eq(tripLocations.tripId, tripId));

			// Add location to trip
			await db.insert(tripLocations).values({
				tripId,
				locationId,
				order: (maxOrder?.max || 0) + 1
			});

			return { success: true };
		} catch (err) {
			console.error('Error adding location to trip:', err);
			return fail(500, { error: 'Failed to add location to trip' });
		}
	},

	removeFromTrip: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in' });
		}

		const formData = await request.formData();
		const tripId = parseInt(formData.get('tripId')?.toString() || '0');
		const locationId = parseInt(formData.get('locationId')?.toString() || '0');

		if (!tripId || !locationId) {
			return fail(400, { error: 'Invalid trip or location ID' });
		}

		try {
			// Verify the trip belongs to the user
			const [trip] = await db
				.select()
				.from(trips)
				.where(and(eq(trips.id, tripId), eq(trips.userId, locals.user.id)))
				.limit(1);

			if (!trip) {
				return fail(403, { error: 'Trip not found or access denied' });
			}

			// Remove location from trip
			await db
				.delete(tripLocations)
				.where(and(eq(tripLocations.tripId, tripId), eq(tripLocations.locationId, locationId)));

			return { success: true };
		} catch (err) {
			console.error('Error removing location from trip:', err);
			return fail(500, { error: 'Failed to remove location from trip' });
		}
	}
};
