<script lang="ts">
	import type { PageData } from './$types';
	import type { Stop, Segment, SegmentMode } from '$lib/types';
	import { computeDerivedArrivalTimes } from '$lib/helpers';
	import { deserialize } from '$app/forms';
	import StopCard from '$lib/components/StopCard.svelte';
	import SegmentChip from '$lib/components/SegmentChip.svelte';
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import JourneyMap from '$lib/components/JourneyMap.svelte';
	import TransitDetailModal from '$lib/components/TransitDetailModal.svelte';
	import WalkRouteModal from '$lib/components/WalkRouteModal.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { cacheJourney } from '$lib/db/local';
	import { flip } from 'svelte/animate';

	let { data }: { data: PageData } = $props();

	let journey = $state(data.journey);
	let journeyStops = $state<Stop[]>(data.stops as Stop[]);
	let journeySegments = $state<Segment[]>(data.segments as Segment[]);

	$effect(() => { journey = data.journey; });
	$effect(() => { journeyStops = data.stops as Stop[]; });
	$effect(() => { journeySegments = data.segments as Segment[]; });

	let editingTitle = $state(false);
	let titleInput = $state(data.journey.title);
	let startDatetime = $state(data.journey.startDatetime ?? '');

	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let saveTimer: ReturnType<typeof setTimeout>;

	let showLocationPicker = $state(false);
	let insertAtIndex = $state<number | null>(null);
	let locationPickerStop = $state<Stop | null>(null);

	let showShareModal = $state(false);
	let shareUrl = $state<string | null>(null);
	let showMap = $state(false);
	let isOffline = $state(false);
	let computingSegmentId = $state<number | null>(null);

	// detail modals
	let showTransitDetail = $state(false);
	let showWalkRoute = $state(false);
	let detailSegment = $state<Segment | null>(null);
	let walkFromName = $state('');
	let walkToName = $state('');

	// transit recompute confirm modal
	let showRecomputeConfirm = $state(false);
	let isRecomputing = $state(false);
	let recomputeTimer: ReturnType<typeof setTimeout>;

	// DND
	let dndItems = $state<(Stop & { id: number })[]>([]);
	$effect(() => { dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex); });

	// Are there any transit segments?
	const hasTransitSegments = $derived(journeySegments.some((s) => s.mode === 'transit'));

	onMount(() => {
		isOffline = !navigator.onLine;
		const off = () => { isOffline = true; goto(`/j/${journey.shareToken || journey.id}`).catch(() => {}); };
		const on = () => (isOffline = false);
		window.addEventListener('offline', off);
		window.addEventListener('online', on);
		cacheJourney(journey.id, { journey, stops: journeyStops, segments: journeySegments });
		return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); };
	});

	const arrivalTimes = $derived(
		computeDerivedArrivalTimes(dndItems, journeySegments, startDatetime ? new Date(startDatetime) : null)
	);

	function findSegment(fromId: number, toId: number): Segment | undefined {
		return journeySegments.find((s) => s.fromStopId === fromId && s.toStopId === toId);
	}

	function stopName(id: number): string {
		return dndItems.find((s) => s.id === id)?.name ?? '';
	}

	// ── post action helper ──────────────────────────────────────────
	async function postAction(action: string, fields: Record<string, string>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) fd.set(k, v);
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'success' && result.data) {
			const d = result.data as Record<string, unknown>;
			if (d.journey) journey = d.journey as typeof journey;
			if (d.stops) journeyStops = d.stops as Stop[];
			if (d.segments) journeySegments = d.segments as Segment[];
			if (d.shareUrl) shareUrl = d.shareUrl as string;
		}
		return result;
	}

	function showStatus(s: 'saving' | 'saved' | 'idle') {
		saveStatus = s;
		if (s === 'saved') setTimeout(() => (saveStatus = 'idle'), 2000);
	}

	// ── Schedule transit recompute after timing change ───────────────
	function scheduleTransitRecompute() {
		if (!hasTransitSegments) return;
		clearTimeout(recomputeTimer);
		recomputeTimer = setTimeout(() => {
			showRecomputeConfirm = true;
		}, 2000);
	}

	async function confirmRecomputeTransit() {
		showRecomputeConfirm = false;
		isRecomputing = true;
		showStatus('saving');
		await postAction('recomputeTransit', {});
		isRecomputing = false;
		showStatus('saved');
	}

	function dismissRecompute() {
		showRecomputeConfirm = false;
	}

	// ── auto-save journey fields ────────────────────────────────────
	function scheduleSave(fields: Record<string, string>) {
		clearTimeout(saveTimer);
		showStatus('saving');
		saveTimer = setTimeout(async () => {
			await postAction('updateJourney', fields);
			showStatus('saved');
		}, 1500);
	}

	function saveTitle() {
		editingTitle = false;
		if (titleInput !== journey.title) scheduleSave({ title: titleInput });
	}

	function updateStartDatetime(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		startDatetime = v;
		scheduleSave({ startDatetime: v });
		scheduleTransitRecompute();
	}

	// ── drag-to-reorder ─────────────────────────────────────────────
	function handleDndConsider(e: CustomEvent<{ items: (Stop & { id: number })[] }>) { dndItems = e.detail.items; }
	async function handleDndFinalize(e: CustomEvent<{ items: (Stop & { id: number })[] }>) {
		dndItems = e.detail.items;
		journeyStops = dndItems.map((s, i) => ({ ...s, orderIndex: i }));
		showStatus('saving');
		await postAction('reorderStops', { stopIds: JSON.stringify(dndItems.map((s) => s.id)) });
		showStatus('saved');
	}

	// ── stop CRUD ───────────────────────────────────────────────────
	function addStop(insertIndex?: number) { insertAtIndex = insertIndex ?? null; locationPickerStop = null; showLocationPicker = true; }

	async function handleLocationConfirm(result: { name: string; lat: number; lon: number }) {
		const orderIndex = insertAtIndex !== null ? insertAtIndex : dndItems.length > 0 ? dndItems[dndItems.length - 1].orderIndex + 1 : 0;
		showStatus('saving');
		await postAction('addStop', { name: result.name, lat: String(result.lat), lon: String(result.lon), orderIndex: String(orderIndex), stayDurationMinutes: '60' });
		showStatus('saved');
	}

	async function updateStop(update: Partial<Stop> & { id: number }) {
		showStatus('saving');
		const fields: Record<string, string> = { stopId: String(update.id) };
		if (update.name !== undefined) fields.name = update.name;
		if (update.lat !== undefined) fields.lat = String(update.lat);
		if (update.lon !== undefined) fields.lon = String(update.lon);
		if (update.stayDurationMinutes !== undefined) fields.stayDurationMinutes = String(update.stayDurationMinutes);
		if (update.notes !== undefined) fields.notes = update.notes ?? '';
		await postAction('updateStop', fields);
		showStatus('saved');

		// If stay time changed and there are transit segments, offer to recompute
		if (update.stayDurationMinutes !== undefined) {
			scheduleTransitRecompute();
		}
	}

	async function deleteStop(stopId: number) { showStatus('saving'); await postAction('deleteStop', { stopId: String(stopId) }); showStatus('saved'); }

	function editStopLocation(stop: Stop) { locationPickerStop = stop; showLocationPicker = true; }
	async function handleLocationUpdateConfirm(result: { name: string; lat: number; lon: number }) {
		if (locationPickerStop) { await updateStop({ id: locationPickerStop.id, name: result.name, lat: result.lat, lon: result.lon }); locationPickerStop = null; }
	}

	// ── segment mode change ─────────────────────────────────────────
	async function changeSegmentMode(segmentId: number, mode: SegmentMode) {
		computingSegmentId = segmentId;
		await postAction('changeSegmentMode', { segmentId: String(segmentId), mode });
		computingSegmentId = null;
	}

	// ── segment detail click ────────────────────────────────────────
	function openSegmentDetail(seg: Segment) {
		detailSegment = seg;
		if (seg.mode === 'transit') {
			showTransitDetail = true;
		} else if (seg.mode === 'walk' || seg.mode === 'drive') {
			walkFromName = stopName(seg.fromStopId);
			walkToName = stopName(seg.toStopId);
			showWalkRoute = true;
		}
	}

	// ── sharing ─────────────────────────────────────────────────────
	async function publishJourney() { await postAction('publish', {}); }
	async function unpublishJourney() { shareUrl = null; await postAction('unpublish', {}); }
	function toggleMapMode() { showMap = !showMap; }
</script>

<svelte:head><title>{journey.title} — Journey Editor</title></svelte:head>

<OfflineBanner />

{#if showMap}
	<JourneyMap stops={journeyStops} segments={journeySegments} onback={toggleMapMode} />
{:else}
	<div class="min-h-[100dvh] bg-base-100">
		<header class="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-3">
			<button class="btn btn-ghost btn-sm" onclick={() => goto('/')}>←</button>
			<div class="flex-1">
				{#if editingTitle}
					<input class="input input-bordered input-sm w-full max-w-xs" bind:value={titleInput} onblur={saveTitle} onkeydown={(e) => e.key === 'Enter' && saveTitle()} />
				{:else}
					<button class="text-lg font-bold hover:underline" onclick={() => (editingTitle = true)}>{journey.title}</button>
				{/if}
			</div>
			<input type="datetime-local" class="input input-bordered input-sm" value={startDatetime ? startDatetime.slice(0, 16) : ''} onchange={updateStartDatetime} />
			<button class="btn btn-ghost btn-sm" onclick={() => (showShareModal = true)}>🔗</button>
			<button class="btn btn-ghost btn-sm" onclick={toggleMapMode}>🗺️</button>
			{#if saveStatus === 'saving'}<span class="text-xs text-base-content/50">Saving…</span>
			{:else if saveStatus === 'saved'}<span class="text-xs text-success">Saved ✓</span>{/if}
		</header>

		<main class="mx-auto max-w-2xl p-4">
			{#if dndItems.length === 0}
				<div class="flex flex-col items-center gap-4 py-12 text-center">
					<div class="text-4xl">📍</div>
					<p class="text-base-content/60">Add your first stop to get started.</p>
				</div>
			{/if}

			<div
				use:dndzone={{ items: dndItems, flipDurationMs: 200, dropTargetStyle: { outline: '2px dashed oklch(var(--p))', borderRadius: '12px' } }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-0"
			>
				{#each dndItems as stop, i (stop.id)}
					<div animate:flip={{ duration: 200 }}>
						{#if i > 0}
							{@const seg = findSegment(dndItems[i - 1].id, stop.id)}
							{#if seg}
								<SegmentChip
									segment={seg}
									onmodechange={changeSegmentMode}
									onclickdetail={openSegmentDetail}
									loading={computingSegmentId === seg.id}
									oninsert={() => addStop(stop.orderIndex)}
								/>
							{:else}
								<div class="flex justify-center py-1">
									<button class="btn btn-ghost btn-xs" onclick={() => addStop(stop.orderIndex)}>＋ Insert stop</button>
								</div>
							{/if}
						{/if}

						<StopCard {stop} arrivalTime={arrivalTimes[i] ?? null} onupdate={updateStop} ondelete={deleteStop} onpicklocation={editStopLocation} />
					</div>
				{/each}
			</div>

			<div class="mt-4 flex justify-center">
				<button class="btn btn-primary btn-sm sm:btn-md" onclick={() => addStop()}>＋ Add Stop</button>
			</div>
			<button class="btn btn-primary btn-circle fixed right-4 bottom-6 z-50 shadow-lg sm:hidden" onclick={() => addStop()} aria-label="Add stop">＋</button>
		</main>
	</div>
{/if}

<!-- modals -->
<LocationPicker bind:open={showLocationPicker} initialLat={locationPickerStop?.lat ?? 50} initialLon={locationPickerStop?.lon ?? 8}
	onconfirm={locationPickerStop ? handleLocationUpdateConfirm : handleLocationConfirm} />

<ShareModal bind:open={showShareModal} journeyId={journey.id} isPublic={journey.isPublic} {shareUrl}
	onpublish={publishJourney} onunpublish={unpublishJourney} />

<TransitDetailModal bind:open={showTransitDetail} segment={detailSegment} />

<WalkRouteModal bind:open={showWalkRoute} segment={detailSegment} fromName={walkFromName} toName={walkToName} />

<!-- Transit recompute confirmation modal -->
{#if showRecomputeConfirm}
	<div class="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 p-4" onclick={dismissRecompute}>
		<div class="bg-base-100 rounded-2xl shadow-2xl max-w-sm w-full p-5" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3 mb-3">
				<span class="text-2xl">🚆</span>
				<h3 class="font-bold text-base">Update Öffi connections?</h3>
			</div>
			<p class="text-sm text-base-content/60 mb-4">
				You changed the timing of your journey. Want to search for new Öffi connections that match the updated schedule?
			</p>
			<div class="flex gap-2 justify-end">
				<button class="btn btn-ghost btn-sm" onclick={dismissRecompute}>Keep current</button>
				<button class="btn btn-primary btn-sm" onclick={confirmRecomputeTransit} disabled={isRecomputing}>
					{#if isRecomputing}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						Update connections
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
