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
	const name = String(err?.name ?? 'UnknownError');
	const code = String(err?.code ?? '');
	const cause = String(err?.cause ?? '');
	console.error(`[request ${requestId}] ${event.request.method} ${event.url.pathname} failed`, {
		status,
		name,
		message: err?.message ?? String(error),
		code: err?.code,
		cause: err?.cause,
		stack: err?.stack
	});

	// A short, safe category — never expose raw messages or stack traces to the client.
	const hint = /ECONNREFUSED|ENOTFOUND|postgres|database/i.test(`${name} ${code} ${cause}`)
		? 'The service could not reach its database.'
		: status === 404
			? 'That page does not exist.'
			: status === 503 || /timeout|unavailable|fetch failed/i.test(name)
				? 'An upstream service is temporarily unavailable.'
				: 'An unexpected server error occurred.';

	return { message, requestId, hint };
};
