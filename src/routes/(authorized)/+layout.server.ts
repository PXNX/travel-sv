import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/auth/login?next=${encodeURIComponent(url.pathname)}`);
	}

	return {
		user: locals.user
	};
};
