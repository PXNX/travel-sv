import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { journeys, stops, segments } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userJourneys = await db
		.select()
		.from(journeys)
		.where(eq(journeys.ownerId, locals.user!.id))
		.orderBy(journeys.createdAt);

	const results = await Promise.all(
		userJourneys.map(async (journey) => {
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
				totalDurationMinutes: totalDuration
			};
		})
	);

	return { journeys: results, user: locals.user };
};

export const actions = {
	create: async ({ locals }) => {
		const [j] = await db
			.insert(journeys)
			.values({ ownerId: locals.user!.id, title: 'Untitled Journey' })
			.returning();

		redirect(303, `/journeys/${j.id}`);
	}
} satisfies Actions;
