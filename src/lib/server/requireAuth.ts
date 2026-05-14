import { redirect } from '@sveltejs/kit';

export function requireAuth(
    locals: App.Locals,
    currentUrl?: URL
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
    if (!locals.user) {
        const next = currentUrl ? `?next=${encodeURIComponent(currentUrl.pathname)}` : '';
        redirect(303, `/auth/login${next}`);
    }
}
