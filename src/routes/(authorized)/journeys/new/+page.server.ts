import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { journeys } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals }) => {
    // T25 — Create a new journey and redirect to its editor
    const [newJourney] = await db
        .insert(journeys)
        .values({
            ownerId: locals.user!.id,
            title: 'Untitled Journey'
        })
        .returning();

    redirect(303, `/journeys/${newJourney.id}`);
};
