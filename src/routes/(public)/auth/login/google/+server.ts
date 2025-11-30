// src/routes/auth/login/google/+server.ts
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import { google } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Generate random state for security
	const randomState = generateState();
	const codeVerifier = generateCodeVerifier();

	// Get the 'next' parameter to redirect after login
	const next = url.searchParams.get('next') || '/';

	// Encode the redirect URL into the state parameter
	// Format: randomState|redirectUrl
	const stateWithRedirect = `${randomState}|${encodeURIComponent(next)}`;

	const authUrl = await google.createAuthorizationURL(randomState, codeVerifier, [
		'profile',
		'email'
	]);

	// Store the full state (with redirect) for validation
	cookies.set('google_oauth_state', stateWithRedirect, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	cookies.set('google_code_verifier', codeVerifier, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	console.log('🔍 Login - Redirect URL:', next);
	console.log('🔍 Login - State with redirect:', stateWithRedirect);

	redirect(302, authUrl.toString());
};
