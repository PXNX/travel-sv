// src/routes/auth/callback/google/+server.ts
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

	console.log('🔍 Callback - Received state from Google:', state);
	console.log('🔍 Callback - Stored state from cookie:', storedStateWithRedirect);

	if (!code || !state || !storedStateWithRedirect || !codeVerifier) {
		console.error('❌ Missing required parameters');
		return new Response('Invalid request', { status: 400 });
	}

	// Extract the random state and redirect URL
	const [storedState, encodedRedirect] = storedStateWithRedirect.split('|');
	const redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : '/';

	console.log('🔍 Callback - Extracted redirect URL:', redirectTo);

	// Validate the state matches (only the random part)
	if (state !== storedState) {
		console.error('❌ State mismatch');
		return new Response('Invalid state', { status: 400 });
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${tokens.accessToken()}` }
		});

		const googleUser = await response.json();

		console.log('👤 Google user:', googleUser.email);

		// Check if user exists, if not create them
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.email, googleUser.email))
			.limit(1);

		let user;
		if (existingUser.length === 0) {
			console.log('✨ Creating new user');
			// Create new user (not admin by default)
			const newUser = await db
				.insert(users)
				.values({
					id: googleUser.sub,
					email: googleUser.email,
					name: googleUser.name,
					picture: googleUser.picture,
					isAdmin: false
				})
				.returning();
			user = newUser[0];
		} else {
			console.log('✅ User already exists');
			user = existingUser[0];
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);

		cookies.set('session', sessionToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
			expires: session.expiresAt,
			path: '/'
		});

		// Clear OAuth cookies
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		console.log('✅ Login successful, redirecting to:', redirectTo);

		return new Response(null, {
			status: 302,
			headers: { Location: redirectTo }
		});
	} catch (e) {
		console.error('❌ Error during authentication:', e);

		// Clear OAuth cookies on error
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		if (e instanceof OAuth2RequestError) {
			return new Response('OAuth error', { status: 400 });
		}
		return new Response('Server error', { status: 500 });
	}
};
