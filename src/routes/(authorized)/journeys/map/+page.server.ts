import type { PageServerLoad } from './$types';
import { listActiveJourneys } from '$lib/server/journeys';

export const load: PageServerLoad = async ({ locals }) => {
	const { journeys } = await listActiveJourneys(locals.user!.id);
	return { journeys };
};
