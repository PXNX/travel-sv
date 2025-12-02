// src/routes/locations/[id]/edit/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { travelTips, pendingEdits } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const locationId = parseInt(params.id);
	if (isNaN(locationId)) {
		throw error(400, 'Invalid location ID');
	}

	const [location] = await db.select().from(travelTips).where(eq(travelTips.id, locationId));

	if (!location) {
		throw error(404, 'Location not found');
	}

	// Check if user has pending edits for this location
	const userPendingEdits = await db
		.select()
		.from(pendingEdits)
		.where(
			and(
				eq(pendingEdits.tipId, locationId),
				eq(pendingEdits.userId, locals.user.id),
				eq(pendingEdits.status, 'pending')
			)
		)
		.limit(1);

	const hasPendingEdit = userPendingEdits.length > 0;
	const pendingEdit = hasPendingEdit ? userPendingEdits[0] : null;

	return {
		location: {
			id: location.id,
			title: pendingEdit?.title ?? location.title,
			description: pendingEdit?.description ?? location.description,
			address: location.address ?? '',
			category: pendingEdit?.category ?? location.category,
			durationMinutes: pendingEdit?.durationMinutes ?? location.durationMinutes,
			bestTimeToVisit: pendingEdit?.bestTimeToVisit ?? location.bestTimeToVisit ?? '',
			googleMapsUrl: pendingEdit?.googleMapsUrl ?? location.googleMapsUrl ?? '',
			tags: pendingEdit?.tags
				? JSON.parse(pendingEdit.tags)
				: location.tags
					? JSON.parse(location.tags)
					: [],
			imageUrl: pendingEdit?.imageUrl ?? location.imageUrl ?? ''
		},
		originalLocation: {
			title: location.title,
			description: location.description,
			category: location.category,
			durationMinutes: location.durationMinutes,
			bestTimeToVisit: location.bestTimeToVisit,
			googleMapsUrl: location.googleMapsUrl,
			tags: location.tags ? JSON.parse(location.tags) : [],
			imageUrl: location.imageUrl
		},
		hasPendingEdit,
		pendingEditId: pendingEdit?.id ?? null,
		isSignedIn: true,
		user: locals.user
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to edit locations' });
		}

		const locationId = parseInt(params.id);
		const formData = await request.formData();

		const editData = {
			title: formData.get('title')?.toString() || null,
			description: formData.get('description')?.toString() || null,
			category: formData.get('category')?.toString() || null,
			durationMinutes: formData.get('duration_minutes')?.toString()
				? parseInt(formData.get('duration_minutes')!.toString())
				: null,
			bestTimeToVisit: formData.get('best_time_to_visit')?.toString() || null,
			googleMapsUrl: formData.get('google_maps_url')?.toString() || null,
			imageUrl: formData.get('image_url')?.toString() || null,
			tags: formData.get('tags')?.toString() || null
		};

		try {
			// If user is admin, apply changes directly
			if (locals.user.isAdmin) {
				await db
					.update(travelTips)
					.set({
						...editData,
						tags: editData.tags,
						category: editData.category as 'food' | 'museum' | 'nature',
						bestTimeToVisit: editData.bestTimeToVisit as
							| 'morning'
							| 'afternoon'
							| 'evening'
							| 'any'
							| null
					})
					.where(eq(travelTips.id, locationId));

				throw redirect(303, `/locations/${locationId}`);
			}

			// Check if user already has a pending edit for this location
			const existingPendingEdit = await db
				.select()
				.from(pendingEdits)
				.where(
					and(
						eq(pendingEdits.tipId, locationId),
						eq(pendingEdits.userId, locals.user.id),
						eq(pendingEdits.status, 'pending')
					)
				)
				.limit(1);

			if (existingPendingEdit.length > 0) {
				// Update existing pending edit
				await db
					.update(pendingEdits)
					.set({
						...editData,
						category: editData.category as 'food' | 'museum' | 'nature' | null,
						bestTimeToVisit: editData.bestTimeToVisit as
							| 'morning'
							| 'afternoon'
							| 'evening'
							| 'any'
							| null
					})
					.where(eq(pendingEdits.id, existingPendingEdit[0].id));
			} else {
				// Create new pending edit
				await db.insert(pendingEdits).values({
					tipId: locationId,
					userId: locals.user.id,
					...editData,
					category: editData.category as 'food' | 'museum' | 'nature' | null,
					bestTimeToVisit: editData.bestTimeToVisit as
						| 'morning'
						| 'afternoon'
						| 'evening'
						| 'any'
						| null,
					status: 'pending'
				});
			}

			throw redirect(303, `/locations/${locationId}?submitted=true`);
		} catch (err) {
			if (err instanceof Response) throw err;
			console.error('Failed to submit edit:', err);
			return fail(500, { error: 'Failed to submit edit. Please try again.' });
		}
	}
};
