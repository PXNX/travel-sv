// src/routes/(authorized)/layout.server.ts
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { travelTips, users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}
};
