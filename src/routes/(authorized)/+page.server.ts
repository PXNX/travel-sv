// src/routes/+page.server.ts
import type { PageServerLoad } from '../$types';
import { db } from '$lib/server/db';
import { travelTips, users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Get all locations with user info
	const locations = await db
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
		.orderBy(travelTips.createdAt);

	return {
		initialLocations: locations.map((location) => ({
			...location,
			likes: 0, // Will be loaded from localStorage
			tags: location.tags ? JSON.parse(location.tags) : []
		}))
	};
};
