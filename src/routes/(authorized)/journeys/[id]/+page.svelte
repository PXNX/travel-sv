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
	import TransitDetailModal from '$lib/components/TransitDetailModal.svelte';

	import { dragHandleZone, type TransformDraggedElementFunction } from 'svelte-dnd-action';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { cacheJourney } from '$lib/db/local';
	import { flip } from 'svelte/animate';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconShare from '~icons/material-symbols/share-outline';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';

	let { data }: { data: PageData } = $props();

	let journey: typeof data.journey = $state(undefined!);
	let journeyStops = $state<Stop[]>([]);
	let journeySegments = $state<Segment[]>([]);

	$effect.pre(() => { journey = data.journey; });
	$effect.pre(() => { journeyStops = data.stops as Stop[]; });
	$effect.pre(() => { journeySegments = data.segments as Segment[]; });

	let editingTitle = $state(false);
	let titleInput = $state('');
	let startDatetime = $state('');

	$effect.pre(() => { titleInput = data.journey.title; });
	$effect.pre(() => { startDatetime = data.journey.startDatetime ?? ''; });

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

	let showTransitDetail = $state(false);
	let showWalkRoute = $state(false);
	let detailSegment = $state<Segment | null>(null);
	let walkFromName = $state('');
	let walkToName = $state('');

	const transitFromCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = dndItems.find(s => s.id === detailSegment!.fromStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	const transitToCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = dndItems.find(s => s.id === detailSegment!.toStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	let showRecomputeConfirm = $state(false);
	let isRecomputing = $state(false);
	let recomputeTimer: ReturnType<typeof setTimeout>;

	let dndItems = $state<(Stop & { id: number })[]>([]);
	$effect(() => { dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex); });

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

	$effect(() => {
		if (journey.isPublic && journey.shareToken && !shareUrl) {
			shareUrl = `${window.location.origin}/j/${journey.shareToken}`;
		} else if (!journey.isPublic) {
			shareUrl = null;
		}
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

	const transformDraggedElement: TransformDraggedElementFunction = (el) => {
		if (!el) return;
		const segPart = el.querySelector('.segment-part') as HTMLElement | null;
		if (segPart && !el.dataset.segOffset) {
			el.dataset.segOffset = String(segPart.getBoundingClientRect().height);
			segPart.style.display = 'none';
		}
		const offset = parseFloat(el.dataset.segOffset || '0');
		if (offset > 0) {
			el.style.top = `${parseFloat(el.style.top || '0') + offset}px`;
		}
		const card = el.querySelector('.card') as HTMLElement | null;
		if (card) {
			card.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,.15), 0 8px 10px -6px rgba(0,0,0,.1)';
			card.style.transform = 'scale(1.02)';
		}
	};

	function handleDndConsider(e: CustomEvent<{ items: (Stop & { id: number })[] }>) { dndItems = e.detail.items; }
	async function handleDndFinalize(e: CustomEvent<{ items: (Stop & { id: number })[] }>) {
		dndItems = e.detail.items;
		journeyStops = dndItems.map((s, i) => ({ ...s, orderIndex: i }));
		showStatus('saving');
		await postAction('reorderStops', { stopIds: JSON.stringify(dndItems.map((s) => s.id)) });
		showStatus('saved');
	}

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

		if (update.stayDurationMinutes !== undefined) {
			scheduleTransitRecompute();
		}
	}

	async function deleteStop(stopId: number) { showStatus('saving'); await postAction('deleteStop', { stopId: String(stopId) }); showStatus('saved'); }

	function editStopLocation(stop: Stop) { locationPickerStop = stop; showLocationPicker = true; }
	async function handleLocationUpdateConfirm(result: { name: string; lat: number; lon: number }) {
		if (locationPickerStop) { await updateStop({ id: locationPickerStop.id, name: result.name, lat: result.lat, lon: result.lon }); locationPickerStop = null; }
	}

	async function changeSegmentMode(segmentId: number, mode: SegmentMode) {
		computingSegmentId = segmentId;
		await postAction('changeSegmentMode', { segmentId: String(segmentId), mode });
		computingSegmentId = null;
	}

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

	function handleTransitWalkClick(walkSegment: Segment, fromName: string, toName: string) {
		showTransitDetail = false;
		detailSegment = walkSegment;
		walkFromName = fromName;
		walkToName = toName;
		showWalkRoute = true;
	}

	async function publishJourney() { await postAction('publish', {}); }
	async function unpublishJourney() { shareUrl = null; await postAction('unpublish', {}); }
	function toggleMapMode() { showMap = !showMap; }
</script>

<svelte:head><title>{journey.title} — Journey Editor</title></svelte:head>

<OfflineBanner />

{#if showMap}
	{#await import('$lib/components/JourneyMap.svelte') then { default: JourneyMap }}
		<JourneyMap stops={journeyStops} segments={journeySegments} onback={toggleMapMode} onupdatestop={updateStop} />
	{/await}
{:else}
	<div class="min-h-[100dvh] bg-base-100" style="view-transition-name: journey-{journey.id}">
		<header class="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-3">
			<button class="btn btn-ghost btn-sm" onclick={() => goto('/')}>
				<IconArrowBack class="h-5 w-5" />
			</button>
			<div class="flex-1">
				{#if editingTitle}
					<input class="input input-bordered input-sm w-full max-w-xs" bind:value={titleInput} onblur={saveTitle} onkeydown={(e) => e.key === 'Enter' && saveTitle()} />
				{:else}
					<button class="text-lg font-bold hover:underline" onclick={() => (editingTitle = true)}>{journey.title}</button>
				{/if}
			</div>
			<input type="datetime-local" class="input input-bordered input-sm" value={startDatetime ? startDatetime.slice(0, 16) : ''} onchange={updateStartDatetime} />
			<button class="btn btn-ghost btn-sm" onclick={() => (showShareModal = true)}>
				<IconShare class="h-5 w-5" />
			</button>
			<button class="btn btn-ghost btn-sm" onclick={toggleMapMode}>
				<IconMap class="h-5 w-5" />
			</button>
			{#if saveStatus === 'saving'}<span class="text-xs text-base-content/50">Saving…</span>
			{:else if saveStatus === 'saved'}<span class="text-xs text-success">Saved ✓</span>{/if}
		</header>

		<main class="mx-auto max-w-2xl p-4">
			{#if dndItems.length === 0}
				<div class="flex flex-col items-center gap-4 py-12 text-center">
					<IconPin class="h-10 w-10 text-base-content/30" />
					<p class="text-base-content/60">Add your first stop to get started.</p>
				</div>
			{/if}

			<div
				use:dragHandleZone={{ items: dndItems, flipDurationMs: 200, dropTargetStyle: { outline: '2px dashed oklch(var(--p))', borderRadius: '12px' }, transformDraggedElement }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-0"
			>
				{#each dndItems as stop, i (stop.id)}
					<div animate:flip={{ duration: 200 }}>
						{#if i > 0}
							{@const seg = findSegment(dndItems[i - 1].id, stop.id)}
							<div class="segment-part">
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
										<button class="btn btn-ghost btn-xs gap-0.5" onclick={() => addStop(stop.orderIndex)}>
											<IconAdd class="h-3.5 w-3.5" /> Insert stop
										</button>
									</div>
								{/if}
							</div>
						{/if}

						<StopCard {stop} arrivalTime={arrivalTimes[i] ?? null} onupdate={updateStop} ondelete={deleteStop} onpicklocation={editStopLocation} />
					</div>
				{/each}
			</div>

			<div class="mt-4 flex justify-center">
				<button class="btn btn-primary btn-sm sm:btn-md gap-1.5" onclick={() => addStop()}>
					<IconAdd class="h-5 w-5" /> Add Stop
				</button>
			</div>
			<button class="btn btn-primary btn-circle fixed right-4 bottom-6 z-50 shadow-lg sm:hidden" onclick={() => addStop()} aria-label="Add stop">
				<IconAdd class="h-6 w-6" />
			</button>
		</main>
	</div>
{/if}

<LocationPicker bind:open={showLocationPicker} initialLat={locationPickerStop?.lat ?? 50} initialLon={locationPickerStop?.lon ?? 8}
	onconfirm={locationPickerStop ? handleLocationUpdateConfirm : handleLocationConfirm} />

<ShareModal bind:open={showShareModal} journeyId={journey.id} journeyTitle={journey.title} isPublic={journey.isPublic} {shareUrl}
	onpublish={publishJourney} onunpublish={unpublishJourney} />

<TransitDetailModal bind:open={showTransitDetail} segment={detailSegment} fromCoords={transitFromCoords} toCoords={transitToCoords} onwalkclick={handleTransitWalkClick} />

{#await import('$lib/components/WalkRouteModal.svelte') then { default: WalkRouteModal }}
	<WalkRouteModal bind:open={showWalkRoute} segment={detailSegment} fromName={walkFromName} toName={walkToName} />
{/await}

{#if showRecomputeConfirm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Update connections" tabindex="-1" onclick={dismissRecompute} onkeydown={(e) => e.key === 'Escape' && dismissRecompute()}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-base-100 rounded-2xl shadow-2xl max-w-sm w-full p-5" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="flex items-center gap-3 mb-3">
				<IconTrain class="h-6 w-6 text-primary" />
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
