import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { journeys, stops, segments } from '$lib/server/schema';
import { recomputeSegments } from '$lib/server/recomputeSegments';
import { listActiveJourneys } from '$lib/server/journeys';

export const load: PageServerLoad = async ({ locals }) => {
	const { journeys: list, completedCount } = await listActiveJourneys(locals.user!.id);
	return { journeys: list, completedCount, user: locals.user };
};

export const actions = {
	/** Plan-from-to: create a journey with two stops and a transit connection. */
	plan: async ({ locals, request }) => {
		const form = await request.formData();
		const text = (key: string) => String(form.get(key) ?? '').trim();
		const fromName = text('fromName');
		const toName = text('toName');
		const fromLat = Number(text('fromLat'));
		const fromLon = Number(text('fromLon'));
		const toLat = Number(text('toLat'));
		const toLon = Number(text('toLon'));
		const rawDate = text('startDatetime');

		if (
			!fromName ||
			!toName ||
			!Number.isFinite(fromLat) ||
			!Number.isFinite(fromLon) ||
			!Number.isFinite(toLat) ||
			!Number.isFinite(toLon)
		) {
			return fail(400, { error: 'Choose a valid start and destination.' });
		}

		const startDatetime = rawDate ? new Date(rawDate) : null;
		if (startDatetime && Number.isNaN(startDatetime.getTime())) {
			return fail(400, { error: 'The departure date is not valid.' });
		}

		const [journey] = await db
			.insert(journeys)
			.values({ ownerId: locals.user!.id, title: `${fromName} → ${toName}`, startDatetime })
			.returning();

		const insertedStops = await db
			.insert(stops)
			.values([
				{
					journeyId: journey.id,
					name: fromName,
					lat: fromLat,
					lon: fromLon,
					orderIndex: 0,
					stayDurationMinutes: 0
				},
				{
					journeyId: journey.id,
					name: toName,
					lat: toLat,
					lon: toLon,
					orderIndex: 1,
					stayDurationMinutes: 0
				}
			])
			.returning();

		// Seed a transit leg so recomputeSegments keeps the planner's default mode.
		await db.insert(segments).values({
			journeyId: journey.id,
			fromStopId: insertedStops[0].id,
			toStopId: insertedStops[1].id,
			mode: 'transit'
		});
		await recomputeSegments(journey.id);

		redirect(303, `/journeys/${journey.id}`);
	},

	create: async ({ locals }) => {
		const [j] = await db
			.insert(journeys)
			.values({ ownerId: locals.user!.id, title: 'Untitled Journey' })
			.returning();
		redirect(303, `/journeys/${j.id}`);
	}
} satisfies Actions;
