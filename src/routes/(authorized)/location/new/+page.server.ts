// src/routes/locations/new/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { travelTips } from '$lib/server/schema';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		isSignedIn: true,
		user: locals.user
	};
};

// Helper function to check for nearby locations
async function checkNearbyLocations(
	latitude: number,
	longitude: number,
	radiusMeters: number = 100
) {
	// Use Haversine formula to find nearby locations
	const result = await db.execute(sql`
		SELECT 
			id, 
			title,
			(
				6371000 * acos(
					cos(radians(${latitude})) * 
					cos(radians(latitude)) * 
					cos(radians(longitude) - radians(${longitude})) + 
					sin(radians(${latitude})) * 
					sin(radians(latitude))
				)
			) AS distance
		FROM ${travelTips}
		WHERE (
			6371000 * acos(
				cos(radians(${latitude})) * 
				cos(radians(latitude)) * 
				cos(radians(longitude) - radians(${longitude})) + 
				sin(radians(${latitude})) * 
				sin(radians(latitude))
			)
		) < ${radiusMeters}
		ORDER BY distance
		LIMIT 1
	`);

	return result.rows[0] as { id: number; title: string; distance: number } | undefined;
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to add locations' });
		}

		const formData = await request.formData();

		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const latitude = parseFloat(formData.get('latitude')?.toString() || '0');
		const longitude = parseFloat(formData.get('longitude')?.toString() || '0');
		const address = formData.get('address')?.toString() || null;
		const category = formData.get('category')?.toString();
		const durationMinutes = parseInt(formData.get('duration_minutes')?.toString() || '60');
		const bestTimeToVisit = formData.get('best_time_to_visit')?.toString() || null;
		const googleMapsUrl = formData.get('google_maps_url')?.toString() || null;
		const imageUrl = formData.get('image_url')?.toString() || null;
		const tagsJson = formData.get('tags')?.toString();
		const tags = tagsJson ? JSON.stringify(JSON.parse(tagsJson)) : null;

		// Validation
		if (!title?.trim()) {
			return fail(400, { error: 'Title is required' });
		}
		if (!description?.trim()) {
			return fail(400, { error: 'Description is required' });
		}
		if (!category || !['food', 'museum', 'nature'].includes(category)) {
			return fail(400, { error: 'Valid category is required' });
		}
		if (durationMinutes < 15) {
			return fail(400, { error: 'Duration must be at least 15 minutes' });
		}

		// Check for nearby locations (within 100 meters)
		const nearbyLocation = await checkNearbyLocations(latitude, longitude, 100);

		if (nearbyLocation) {
			return fail(400, {
				error: 'A location already exists very close to this position',
				duplicateWarning: {
					title: nearbyLocation.title,
					distance: Math.round(nearbyLocation.distance)
				}
			});
		}

		try {
			const [newLocation] = await db
				.insert(travelTips)
				.values({
					userId: locals.user.id,
					title,
					description,
					latitude,
					longitude,
					address,
					category: category as 'food' | 'museum' | 'nature',
					durationMinutes,
					bestTimeToVisit: bestTimeToVisit as 'morning' | 'afternoon' | 'evening' | 'any' | null,
					googleMapsUrl,
					tags,
					imageUrl
				})
				.returning();

			throw redirect(303, `/locations/${newLocation.id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			console.error('Error creating location:', err);
			return fail(500, { error: 'Failed to create location. Please try again.' });
		}
	}
};
