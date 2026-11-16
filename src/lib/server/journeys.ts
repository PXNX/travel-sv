import { db } from './db';
import { journeys, stops, segments } from './schema';
import { and, eq, asc } from 'drizzle-orm';

/** Active journeys with the derived facts used by the register and map views. */
export async function listActiveJourneys(userId: string) {
	const own = await db
		.select()
		.from(journeys)
		.where(and(eq(journeys.ownerId, userId), eq(journeys.isCompleted, false)))
		.orderBy(journeys.createdAt);

	const completed = await db
		.select({ id: journeys.id })
		.from(journeys)
		.where(and(eq(journeys.ownerId, userId), eq(journeys.isCompleted, true)));

	const results = await Promise.all(
		own.map(async (journey) => {
			const journeyStops = await db
				.select()
				.from(stops)
				.where(eq(stops.journeyId, journey.id))
				.orderBy(asc(stops.orderIndex));
			const journeySegments = await db
				.select()
				.from(segments)
				.where(eq(segments.journeyId, journey.id));

			const firstStop = journeyStops[0] ?? null;
			const lastStop = journeyStops.length > 1 ? journeyStops[journeyStops.length - 1] : null;
			let totalDuration = 0;
			for (const s of journeyStops) totalDuration += s.stayDurationMinutes ?? 0;
			for (const s of journeySegments) totalDuration += s.travelDurationMinutes ?? 0;

			return {
				...journey,
				startDatetime: journey.startDatetime?.toISOString() ?? null,
				createdAt: journey.createdAt.toISOString(),
				updatedAt: journey.updatedAt.toISOString(),
				firstStopName: firstStop?.name ?? null,
				lastStopName: lastStop?.name ?? null,
				stopCount: journeyStops.length,
				totalDurationMinutes: totalDuration,
				stopCoords: journeyStops.map((s) => ({ lat: s.lat, lon: s.lon }))
			};
		})
	);

	return { journeys: results, completedCount: completed.length };
}
