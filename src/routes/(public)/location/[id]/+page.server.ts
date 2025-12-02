// src/routes/locations/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { travelTips, users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const locationId = parseInt(params.id);

	// Get location with user info
	const result = await db
		.select({
			id: travelTips.id,
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
			userId: travelTips.userId,
			userName: users.name,
			createdAt: travelTips.createdAt,
			updatedAt: travelTips.updatedAt
		})
		.from(travelTips)
		.leftJoin(users, eq(travelTips.userId, users.id))
		.where(eq(travelTips.id, locationId))
		.limit(1);

	if (result.length === 0) {
		throw error(404, 'Location not found');
	}

	const location = result[0];
	const submitted = url.searchParams.get('submitted') === 'true';

	return {
		location: {
			...location,
			likes: 0, // Will be loaded from localStorage
			tags: location.tags ? JSON.parse(location.tags) : []
		},
		userHasLiked: false, // Will be loaded from localStorage
		submitted
	};
};

// Remove like/unlike actions since they're localStorage only
export const actions: Actions = {};
