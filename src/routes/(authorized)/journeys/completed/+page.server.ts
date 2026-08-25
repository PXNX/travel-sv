import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { journeys, stops, segments } from '$lib/server/schema';
import { and, asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const completed = await db
		.select()
		.from(journeys)
		.where(and(eq(journeys.ownerId, locals.user!.id), eq(journeys.isCompleted, true)))
		.orderBy(asc(journeys.updatedAt));

	const results = await Promise.all(
		completed.map(async (journey) => {
			const journeyStops = await db
				.select()
				.from(stops)
				.where(eq(stops.journeyId, journey.id))
				.orderBy(asc(stops.orderIndex));
			const journeySegments = await db
				.select()
				.from(segments)
				.where(eq(segments.journeyId, journey.id));
			const totalDurationMinutes =
				journeyStops.reduce((sum, stop) => sum + (stop.stayDurationMinutes ?? 0), 0) +
				journeySegments.reduce((sum, segment) => sum + (segment.travelDurationMinutes ?? 0), 0);
			return {
				...journey,
				startDatetime: journey.startDatetime?.toISOString() ?? null,
				createdAt: journey.createdAt.toISOString(),
				updatedAt: journey.updatedAt.toISOString(),
				firstStopName: journeyStops[0]?.name ?? null,
				lastStopName:
					journeyStops.length > 1 ? (journeyStops[journeyStops.length - 1]?.name ?? null) : null,
				stopCount: journeyStops.length,
				totalDurationMinutes,
				stopCoords: journeyStops.map((stop) => ({ lat: stop.lat, lon: stop.lon }))
			};
		})
	);

	return { journeys: results };
};
