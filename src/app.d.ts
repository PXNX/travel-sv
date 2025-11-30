// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				isAdmin: boolean;
			} | null;
			session: {
				id: string;
				expiresAt: Date;
			} | null;
		}
	}
}

export {};
