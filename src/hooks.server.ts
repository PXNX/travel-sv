import { validateSessionToken } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');

	if (token) {
		const result = await validateSessionToken(token);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
		}
	}

	if (!event.locals.user) {
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
