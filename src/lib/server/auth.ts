import { Google } from 'arctic';
import { db } from './db';
import { sessions, users } from './schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI
} from '$env/static/private';

// T12 — Arctic Google provider
export const google = new Google(
	GOOGLE_CLIENT_ID ?? '',
	GOOGLE_CLIENT_SECRET ?? '',
	GOOGLE_REDIRECT_URI ?? 'http://localhost:3021/auth/callback/google'
);

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(
	token: string,
	userId: string
): Promise<{ id: string; userId: string; expiresAt: Date }> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

	await db.insert(sessions).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return { id: sessionId, userId, expiresAt };
}

export async function validateSessionToken(
	token: string
): Promise<{ user: App.Locals['user']; session: { id: string; expiresAt: Date } } | null> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const result = await db
		.select({
			session: sessions,
			user: users
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (result.length === 0) return null;

	const { session, user } = result[0];

	if (session.expiresAt < new Date()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}

	if (session.expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 15) {
		const newExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId));
		session.expiresAt = newExpiry;
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.displayName,
			isAdmin: false
		},
		session: {
			id: session.id,
			expiresAt: session.expiresAt
		}
	};
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function requireAuth(
	locals: App.Locals,
	currentPath?: string
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
	if (!locals.user) {
		const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : '';
		throw new Error(`REDIRECT:/auth/login${next}`);
	}
}
