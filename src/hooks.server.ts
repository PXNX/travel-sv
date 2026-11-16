import { validateSessionToken } from '$lib/server/auth';
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId =
		event.request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
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

	const response = await resolve(event);
	response.headers.set('x-request-id', event.locals.requestId);
	return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const requestId = event.locals.requestId || crypto.randomUUID();
	const err = error as {
		name?: unknown;
		message?: unknown;
		stack?: unknown;
		cause?: unknown;
		code?: unknown;
	};
	console.error(`[request ${requestId}] ${event.request.method} ${event.url.pathname} failed`, {
		status,
		name: err?.name ?? 'UnknownError',
		message: err?.message ?? String(error),
		code: err?.code,
		cause: err?.cause,
		stack: err?.stack
	});
	return { message, requestId };
};
