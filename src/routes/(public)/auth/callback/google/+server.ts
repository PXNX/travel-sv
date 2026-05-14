import { OAuth2RequestError } from 'arctic';
import { google, generateSessionToken, createSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { users } from '$lib/server/schema';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedStateWithRedirect = cookies.get('google_oauth_state');
	const codeVerifier = cookies.get('google_code_verifier');

	if (!code || !state || !storedStateWithRedirect || !codeVerifier) {
		return new Response('Invalid request', { status: 400 });
	}

	const [storedState, encodedRedirect] = storedStateWithRedirect.split('|');
	const redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : '/';

	if (state !== storedState) {
		return new Response('Invalid state', { status: 400 });
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${tokens.accessToken()}` }
		});

		const googleUser = await response.json();

		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.email, googleUser.email))
			.limit(1);

		let user;
		if (existingUser.length === 0) {
			const newUser = await db
				.insert(users)
				.values({
					id: googleUser.sub,
					provider: 'google',
					providerId: googleUser.sub,
					email: googleUser.email,
					displayName: googleUser.name,
					avatarUrl: googleUser.picture
				})
				.returning();
			user = newUser[0];
		} else {
			user = existingUser[0];
		}

		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);

		cookies.set('session', sessionToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
			expires: session.expiresAt,
			path: '/'
		});

		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		return new Response(null, {
			status: 302,
			headers: { Location: redirectTo }
		});
	} catch (e) {
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		if (e instanceof OAuth2RequestError) {
			return new Response('OAuth error', { status: 400 });
		}
		return new Response('Server error', { status: 500 });
	}
};
