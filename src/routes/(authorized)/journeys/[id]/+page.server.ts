import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { journeys, stops, segments } from '$lib/server/schema';
import { eq, and, asc } from 'drizzle-orm';
import { recomputeSegments } from '$lib/server/recomputeSegments';
import { computeSegment, NoConfirmedTransitError } from '$lib/server/computeSegment';
import type { SegmentMode, Stop } from '$lib/types';

// ── helpers ─────────────────────────────────────────────────────────
function journeyId(params: { id: string }) {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Invalid journey ID');
	return id;
}

async function ownedJourney(id: number, userId: string) {
	const [j] = await db
		.select()
		.from(journeys)
		.where(and(eq(journeys.id, id), eq(journeys.ownerId, userId)));
	if (!j) throw error(404, 'Journey not found');
	return j;
}

async function mutableOwnedJourney(id: number, userId: string) {
	const journey = await ownedJourney(id, userId);
	if (journey.isCompleted) throw error(409, 'Completed journeys are view only');
	return journey;
}

function fd(form: FormData, key: string): string {
	return (form.get(key) as string) ?? '';
}

async function fullPayload(id: number) {
	const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
	const journeyStops = await db
		.select()
		.from(stops)
		.where(eq(stops.journeyId, id))
		.orderBy(asc(stops.orderIndex));
	const rawSegments = await db.select().from(segments).where(eq(segments.journeyId, id));

	// Deserialize JSON text columns into real objects
	const journeySegments = rawSegments.map((s) => ({
		...s,
		transitLegs: s.transitLegs ? JSON.parse(s.transitLegs) : null,
		walkGeometry: s.walkGeometry ? JSON.parse(s.walkGeometry) : null,
		driveGeometry: s.driveGeometry ? JSON.parse(s.driveGeometry) : null,
		transitGeometry: s.transitGeometry ? JSON.parse(s.transitGeometry) : null
	}));

	return {
		journey: {
			...journey,
			startDatetime: journey.startDatetime?.toISOString() ?? null,
			createdAt: journey.createdAt.toISOString(),
			updatedAt: journey.updatedAt.toISOString()
		},
		stops: journeyStops,
		segments: journeySegments
	};
}

async function recomputeTransitSegments(
	id: number,
	minimumTransferMinutes: number,
	deutschlandticketOnly: boolean
) {
	const transitSegs = await db
		.select()
		.from(segments)
		.where(and(eq(segments.journeyId, id), eq(segments.mode, 'transit')));
	for (const seg of transitSegs) {
		const [fromStop] = await db.select().from(stops).where(eq(stops.id, seg.fromStopId));
		const [toStop] = await db.select().from(stops).where(eq(stops.id, seg.toStopId));
		if (!fromStop || !toStop) continue;
		try {
			await computeSegment(
				fromStop as Stop,
				toStop as Stop,
				id,
				'transit',
				minimumTransferMinutes,
				deutschlandticketOnly,
				{ requireConfirmed: true }
			);
		} catch (err) {
			console.error(`recomputeTransit seg ${seg.id} failed:`, err);
		}
	}
}

// ── load ────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ params, locals }) => {
	const id = journeyId(params);
	await ownedJourney(id, locals.user!.id);
	const payload = await fullPayload(id);
	return { ...payload, user: locals.user };
};

// ── actions ─────────────────────────────────────────────────────────
export const actions = {
	/* ── journey fields ───────────────────────────────────────────── */
	updateJourney: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();

		const updates: Record<string, unknown> = { updatedAt: new Date() };
		if (form.has('title')) updates.title = fd(form, 'title');
		if (form.has('description')) updates.description = fd(form, 'description') || null;
		if (form.has('startDatetime')) {
			const v = fd(form, 'startDatetime');
			updates.startDatetime = v ? new Date(v) : null;
		}
		if (form.has('minimumTransferMinutes')) {
			const minutes = Number.parseInt(fd(form, 'minimumTransferMinutes'), 10);
			if (!Number.isFinite(minutes)) return fail(400, { error: 'minimumTransferMinutes required' });
			updates.minimumTransferMinutes = Math.max(0, Math.min(30, minutes));
		}
		if (form.has('deutschlandticketOnly'))
			updates.deutschlandticketOnly = fd(form, 'deutschlandticketOnly') === 'true';
		if (form.has('isCompleted')) updates.isCompleted = fd(form, 'isCompleted') === 'true';

		await db.update(journeys).set(updates).where(eq(journeys.id, id));
		if (
			typeof updates.minimumTransferMinutes === 'number' ||
			typeof updates.deutschlandticketOnly === 'boolean'
		) {
			const journey = await ownedJourney(id, locals.user!.id);
			await recomputeTransitSegments(
				id,
				journey.minimumTransferMinutes,
				journey.deutschlandticketOnly
			);
		}
		return await fullPayload(id);
	},

	/* ── add stop ─────────────────────────────────────────────────── */
	addStop: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();

		const name = fd(form, 'name');
		const lat = parseFloat(fd(form, 'lat'));
		const lon = parseFloat(fd(form, 'lon'));
		if (!name || isNaN(lat) || isNaN(lon)) return fail(400, { error: 'name/lat/lon required' });

		let orderIndex = form.has('orderIndex') ? parseInt(fd(form, 'orderIndex')) : undefined;

		if (orderIndex !== undefined && !isNaN(orderIndex)) {
			// shift subsequent stops
			const toShift = await db.select().from(stops).where(eq(stops.journeyId, id));
			for (const s of toShift.filter((s) => s.orderIndex >= orderIndex!)) {
				await db
					.update(stops)
					.set({ orderIndex: s.orderIndex + 1 })
					.where(eq(stops.id, s.id));
			}
		} else {
			const existing = await db
				.select()
				.from(stops)
				.where(eq(stops.journeyId, id))
				.orderBy(asc(stops.orderIndex));
			orderIndex = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 0;
		}

		await db.insert(stops).values({
			journeyId: id,
			name,
			lat,
			lon,
			orderIndex,
			stayDurationMinutes: parseInt(fd(form, 'stayDurationMinutes') || '60') || 60,
			notes: fd(form, 'notes') || null
		});

		await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
		await recomputeSegments(id);
		return await fullPayload(id);
	},

	/* ── update stop ──────────────────────────────────────────────── */
	updateStop: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const stopId = parseInt(fd(form, 'stopId'));
		if (isNaN(stopId)) return fail(400, { error: 'stopId required' });

		const updates: Record<string, unknown> = {};
		if (form.has('name')) updates.name = fd(form, 'name');
		if (form.has('lat')) updates.lat = parseFloat(fd(form, 'lat'));
		if (form.has('lon')) updates.lon = parseFloat(fd(form, 'lon'));
		if (form.has('stayDurationMinutes'))
			updates.stayDurationMinutes = parseInt(fd(form, 'stayDurationMinutes'));
		if (form.has('notes')) updates.notes = fd(form, 'notes') || null;

		await db
			.update(stops)
			.set(updates)
			.where(and(eq(stops.id, stopId), eq(stops.journeyId, id)));

		await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));

		const locationChanged = form.has('lat') || form.has('lon');
		if (locationChanged) await recomputeSegments(id);

		return await fullPayload(id);
	},

	/* ── delete stop ──────────────────────────────────────────────── */
	deleteStop: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const stopId = parseInt(fd(form, 'stopId'));

		await db.delete(stops).where(and(eq(stops.id, stopId), eq(stops.journeyId, id)));
		await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
		await recomputeSegments(id);
		return await fullPayload(id);
	},

	/* ── reorder stops ────────────────────────────────────────────── */
	reorderStops: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const stopIds: number[] = JSON.parse(fd(form, 'stopIds'));

		await Promise.all(
			stopIds.map((sid, idx) =>
				db
					.update(stops)
					.set({ orderIndex: idx })
					.where(and(eq(stops.id, sid), eq(stops.journeyId, id)))
			)
		);

		await db.update(journeys).set({ updatedAt: new Date() }).where(eq(journeys.id, id));
		await recomputeSegments(id);
		return await fullPayload(id);
	},

	/* ── change segment mode (walk / transit / drive) ─────────────── */
	changeSegmentMode: async ({ params, request, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const segmentId = parseInt(fd(form, 'segmentId'));
		const mode = fd(form, 'mode') as SegmentMode;

		if (!['walk', 'transit', 'drive'].includes(mode)) return fail(400, { error: 'invalid mode' });

		const [seg] = await db
			.select()
			.from(segments)
			.where(and(eq(segments.id, segmentId), eq(segments.journeyId, id)));
		if (!seg) return fail(404, { error: 'segment not found' });

		// Fetch the two stops this segment connects
		const [fromStop] = await db.select().from(stops).where(eq(stops.id, seg.fromStopId));
		const [toStop] = await db.select().from(stops).where(eq(stops.id, seg.toStopId));

		if (fromStop && toStop) {
			const journey = await ownedJourney(id, locals.user!.id);
			try {
				await computeSegment(
					fromStop as Stop,
					toStop as Stop,
					id,
					mode,
					journey.minimumTransferMinutes,
					journey.deutschlandticketOnly,
					mode === 'transit' ? { requireConfirmed: true } : {}
				);
			} catch (cause) {
				if (cause instanceof NoConfirmedTransitError)
					return fail(503, {
						error:
							'No confirmed public-transport connection is available right now. The current segment was left unchanged.'
					});
				throw cause;
			}
		}

		return await fullPayload(id);
	},

	/* ── publish / unpublish ──────────────────────────────────────── */
	publish: async ({ params, locals, url }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);
		const shareToken = crypto.randomUUID();

		await db
			.update(journeys)
			.set({ isPublic: true, shareToken, updatedAt: new Date() })
			.where(eq(journeys.id, id));

		const payload = await fullPayload(id);
		return { ...payload, shareUrl: `${url.origin}/j/${shareToken}` };
	},

	unpublish: async ({ params, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);

		await db
			.update(journeys)
			.set({ isPublic: false, shareToken: null, updatedAt: new Date() })
			.where(eq(journeys.id, id));

		return await fullPayload(id);
	},

	/* ── recompute only transit segments (after stay-time / start-time change) ─ */
	recomputeTransit: async ({ params, locals }) => {
		const id = journeyId(params);
		await mutableOwnedJourney(id, locals.user!.id);

		const journey = await ownedJourney(id, locals.user!.id);
		await recomputeTransitSegments(
			id,
			journey.minimumTransferMinutes,
			journey.deutschlandticketOnly
		);

		return await fullPayload(id);
	},

	shiftTransitConnection: async ({ params, request, locals }) => {
		const id = journeyId(params);
		const journey = await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const segmentId = Number.parseInt(fd(form, 'segmentId'), 10);
		const direction = Number.parseInt(fd(form, 'direction'), 10);
		if (!Number.isInteger(segmentId) || ![-1, 1].includes(direction))
			return fail(400, { error: 'segmentId and direction required' });
		const [segment] = await db
			.select()
			.from(segments)
			.where(and(eq(segments.id, segmentId), eq(segments.journeyId, id)));
		if (!segment || segment.mode !== 'transit')
			return fail(404, { error: 'transit segment not found' });
		const [fromStop] = await db.select().from(stops).where(eq(stops.id, segment.fromStopId));
		const [toStop] = await db.select().from(stops).where(eq(stops.id, segment.toStopId));
		const legs = segment.transitLegs
			? (JSON.parse(segment.transitLegs) as { type?: string; departure?: string }[])
			: [];
		const reference = legs.find((leg) => leg.type === 'transport')?.departure;
		if (!fromStop || !toStop || !reference)
			return fail(400, { error: 'connection reference unavailable' });
		try {
			await computeSegment(
				fromStop as Stop,
				toStop as Stop,
				id,
				'transit',
				journey.minimumTransferMinutes,
				journey.deutschlandticketOnly,
				{ referenceTime: new Date(reference), earlierThan: direction < 0, requireConfirmed: true }
			);
		} catch (cause) {
			if (cause instanceof NoConfirmedTransitError)
				return fail(422, {
					error:
						'No confirmed earlier or later connection is available. The current connection remains unchanged.'
				});
			throw cause;
		}
		return await fullPayload(id);
	},

	replaceFromLocal: async ({ params, request, locals }) => {
		const id = journeyId(params);
		const cloudJourney = await mutableOwnedJourney(id, locals.user!.id);
		const form = await request.formData();
		const baseUpdatedAt = fd(form, 'baseUpdatedAt');
		if (baseUpdatedAt && cloudJourney.updatedAt.toISOString() !== baseUpdatedAt) {
			return fail(409, { conflict: true, cloudUpdatedAt: cloudJourney.updatedAt.toISOString() });
		}

		let draft: {
			journey?: Partial<typeof journeys.$inferSelect>;
			stops?: Stop[];
			segments?: (typeof segments.$inferSelect)[];
		};
		try {
			draft = JSON.parse(fd(form, 'snapshot'));
		} catch {
			return fail(400, { error: 'A valid local journey snapshot is required.' });
		}
		if (!draft.journey || !Array.isArray(draft.stops) || !Array.isArray(draft.segments)) {
			return fail(400, { error: 'The local journey snapshot is incomplete.' });
		}

		await db.delete(segments).where(eq(segments.journeyId, id));
		await db.delete(stops).where(eq(stops.journeyId, id));
		await db
			.update(journeys)
			.set({
				title: draft.journey.title || cloudJourney.title,
				description: draft.journey.description || null,
				startDatetime: draft.journey.startDatetime ? new Date(draft.journey.startDatetime) : null,
				minimumTransferMinutes: Math.max(
					0,
					Math.min(
						30,
						Number(draft.journey.minimumTransferMinutes ?? cloudJourney.minimumTransferMinutes)
					)
				),
				deutschlandticketOnly:
					draft.journey.deutschlandticketOnly ?? cloudJourney.deutschlandticketOnly,
				isCompleted: draft.journey.isCompleted === true,
				updatedAt: new Date()
			})
			.where(eq(journeys.id, id));

		const stopMap = new Map<number, number>();
		for (const [index, stop] of [...draft.stops]
			.sort((a, b) => a.orderIndex - b.orderIndex)
			.entries()) {
			if (!stop.name || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) {
				return fail(400, { error: 'Every local stop requires a name and valid coordinates.' });
			}
			const [inserted] = await db
				.insert(stops)
				.values({
					journeyId: id,
					name: stop.name,
					lat: stop.lat,
					lon: stop.lon,
					orderIndex: index,
					stayDurationMinutes: stop.stayDurationMinutes ?? 60,
					notes: stop.notes || null
				})
				.returning();
			stopMap.set(stop.id, inserted.id);
		}

		for (const segment of draft.segments) {
			const fromStopId = stopMap.get(segment.fromStopId);
			const toStopId = stopMap.get(segment.toStopId);
			if (!fromStopId || !toStopId) continue;
			await db.insert(segments).values({
				journeyId: id,
				fromStopId,
				toStopId,
				mode: segment.mode,
				distanceM: segment.distanceM ?? null,
				elevationUpM: segment.elevationUpM ?? null,
				elevationDownM: segment.elevationDownM ?? null,
				travelDurationMinutes: segment.travelDurationMinutes ?? null,
				transitSummary: segment.transitSummary ?? null,
				transitLegs: segment.transitLegs ? JSON.stringify(segment.transitLegs) : null,
				walkToStationMin: segment.walkToStationMin ?? null,
				walkFromStationMin: segment.walkFromStationMin ?? null,
				transfers: segment.transfers ?? null,
				walkGeometry: segment.walkGeometry ? JSON.stringify(segment.walkGeometry) : null,
				driveGeometry: segment.driveGeometry ? JSON.stringify(segment.driveGeometry) : null,
				transitGeometry: segment.transitGeometry ? JSON.stringify(segment.transitGeometry) : null
			});
		}

		return await fullPayload(id);
	}
} satisfies Actions;
