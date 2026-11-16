<script lang="ts">
	// Papier & Tinte: journey editor as a layered route sheet with ink rules and amber wayfinding.
	import type { PageData } from './$types';
	import type { Stop, Segment, SegmentMode } from '$lib/types';
	import { computeDerivedArrivalTimes, formatDuration, formatDistance } from '$lib/helpers';
	import { deserialize } from '$app/forms';
	import { browser } from '$app/environment';
	import StopCard from '$lib/journeys/StopCard.svelte';
	import SegmentChip from '$lib/journeys/SegmentChip.svelte';
	import ShareModal from '$lib/journeys/ShareModal.svelte';
	import OfflineBanner from '$lib/app/OfflineBanner.svelte';
	import TransitDetailModal from '$lib/journeys/TransitDetailModal.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import { SaveStatus } from '$lib/ui';

	import { dragHandleZone, type TransformDraggedElementFunction } from 'svelte-dnd-action';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		cacheJourney,
		clearLocalJourneyDraft,
		getLocalJourneyDraft,
		saveLocalJourneyDraft,
		type LocalJourneySnapshot
	} from '$lib/db/local';
	import { flip } from 'svelte/animate';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconShare from '~icons/material-symbols/share-outline';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconTune from '~icons/material-symbols/tune-rounded';
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';

	let { data }: { data: PageData } = $props();

	let journey: typeof data.journey = $state(undefined!);
	let journeyStops = $state<Stop[]>([]);
	let journeySegments = $state<Segment[]>([]);

	$effect.pre(() => {
		journey = data.journey;
	});
	$effect.pre(() => {
		journeyStops = data.stops as Stop[];
	});
	$effect.pre(() => {
		journeySegments = data.segments as Segment[];
	});

	let editingTitle = $state(false);
	let titleInput = $state('');
	let startDatetime = $state('');

	$effect.pre(() => {
		titleInput = data.journey.title;
	});
	$effect.pre(() => {
		startDatetime = data.journey.startDatetime ?? '';
	});

	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let saveTimer: ReturnType<typeof setTimeout>;
	let syncState = $state<'synced' | 'local' | 'conflict' | 'uploading'>('synced');
	let localBaseUpdatedAt = $state<string | null>(null);
	let syncError = $state<string | null>(null);
	let localStopId = $state(-1);
	let localSegmentId = $state(-1);

	let showLocationPicker = $state(false);
	let insertAtIndex = $state<number | null>(null);
	let locationPickerStop = $state<Stop | null>(null);

	let showShareModal = $state(false);
	let shareUrl = $state<string | null>(null);
	let showMap = $state(false);
	let showTransitSettings = $state(false);
	let minimumTransferMinutes = $state(data.journey.minimumTransferMinutes ?? 5);
	let deutschlandticketOnly = $state(data.journey.deutschlandticketOnly ?? true);
	let savingTransitSettings = $state(false);
	let isOffline = $state(false);
	let computingSegmentId = $state<number | null>(null);
	let transitProviderError = $state<string | null>(null);

	let showTransitDetail = $state(false);
	let showWalkRoute = $state(false);
	let detailSegment = $state<Segment | null>(null);
	let changingConnection = $state(false);
	let transitAlternativeError = $state<string | null>(null);
	let walkFromName = $state('');
	let walkToName = $state('');

	const transitFromCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = dndItems.find((s) => s.id === detailSegment!.fromStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	const transitToCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = dndItems.find((s) => s.id === detailSegment!.toStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	let celebrating = $state(false);
	let celebrateTimer: ReturnType<typeof setTimeout>;

	let showRecomputeConfirm = $state(false);
	let isRecomputing = $state(false);
	let recomputeTimer: ReturnType<typeof setTimeout>;

	let dndItems = $state<(Stop & { id: number })[]>([]);
	$effect(() => {
		dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex);
	});

	const hasTransitSegments = $derived(journeySegments.some((s) => s.mode === 'transit'));
	const isReadOnly = $derived(journey.isCompleted === true);

	onMount(() => {
		isOffline = !navigator.onLine;
		const off = () => {
			isOffline = true;
			goto(`/j/${journey.shareToken || journey.id}`).catch(() => {});
		};
		const on = () => (isOffline = false);
		window.addEventListener('offline', off);
		window.addEventListener('online', on);
		// The draft restore is async, but onMount must return its cleanup synchronously.
		void (async () => {
			const draft = await getLocalJourneyDraft(journey.id);
			if (draft) {
				journey = draft.snapshot.journey as typeof journey;
				journeyStops = draft.snapshot.stops;
				journeySegments = draft.snapshot.segments;
				localBaseUpdatedAt = draft.baseUpdatedAt;
				syncState = draft.baseUpdatedAt !== data.journey.updatedAt ? 'conflict' : 'local';
			} else {
				localBaseUpdatedAt = data.journey.updatedAt;
				await cacheJourney(journey.id, { journey, stops: journeyStops, segments: journeySegments });
			}
		})();
		return () => {
			window.removeEventListener('offline', off);
			window.removeEventListener('online', on);
		};
	});

	$effect(() => {
		if (!browser) return;
		if (journey.isPublic && journey.shareToken && !shareUrl) {
			shareUrl = `${window.location.origin}/j/${journey.shareToken}`;
		} else if (!journey.isPublic) {
			shareUrl = null;
		}
	});

	const arrivalTimes = $derived(
		computeDerivedArrivalTimes(
			dndItems,
			journeySegments,
			startDatetime ? new Date(startDatetime) : null
		)
	);

	const overview = $derived.by(() => {
		const travel = journeySegments.reduce((sum, s) => sum + (s.travelDurationMinutes ?? 0), 0);
		const stays = journeyStops.reduce((sum, s) => sum + (s.stayDurationMinutes ?? 0), 0);
		const distance = journeySegments.reduce((sum, s) => sum + (s.distanceM ?? 0), 0);
		return { travel, stays, distance, total: travel + stays };
	});

	function findSegment(fromId: number, toId: number): Segment | undefined {
		return journeySegments.find((s) => s.fromStopId === fromId && s.toStopId === toId);
	}

	function stopName(id: number): string {
		return dndItems.find((s) => s.id === id)?.name ?? '';
	}

	function snapshot(): LocalJourneySnapshot {
		// Svelte $state values are reactive proxies, which IndexedDB and structuredClone cannot store.
		// JSON serialization intentionally turns the snapshot into plain, durable browser-storage data.
		const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
		return {
			journey: plain(journey),
			stops: plain(journeyStops),
			segments: plain(journeySegments)
		};
	}

	async function saveLocally(force = false) {
		if (isReadOnly && !force) return;
		showStatus('saving');
		try {
			const localSnapshot = snapshot();
			await saveLocalJourneyDraft(
				journey.id,
				localSnapshot,
				localBaseUpdatedAt ?? data.journey.updatedAt
			);
			try {
				await cacheJourney(journey.id, localSnapshot);
			} catch (cause) {
				console.warn('Journey cache update failed after the local draft was saved.', cause);
			}
			syncState = syncState === 'conflict' ? 'conflict' : 'local';
			syncError = null;
			showStatus('saved');
		} catch (cause) {
			console.error('Journey could not be saved locally.', cause);
			syncError =
				'This browser could not save the change locally. Check private-browsing or storage permissions and try again.';
			showStatus('idle');
		}
	}

	function rebuildLocalSegments(stopsToConnect: Stop[]) {
		const ordered = [...stopsToConnect].sort((a, b) => a.orderIndex - b.orderIndex);
		journeySegments = ordered.slice(1).map((stop, index) => {
			const fromStop = ordered[index];
			return (
				journeySegments.find(
					(segment) => segment.fromStopId === fromStop.id && segment.toStopId === stop.id
				) ?? {
					id: localSegmentId--,
					journeyId: journey.id,
					fromStopId: fromStop.id,
					toStopId: stop.id,
					mode: 'walk' as SegmentMode,
					travelDurationMinutes: null,
					distanceM: null
				}
			);
		});
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
		if (hasTransitSegments && !isReadOnly) showRecomputeConfirm = true;
	}

	async function confirmRecomputeTransit() {
		showRecomputeConfirm = false;
		isRecomputing = false;
		syncError = 'Connection updates run when you upload your local changes.';
	}

	async function saveTransitSettings() {
		journey = { ...journey, minimumTransferMinutes, deutschlandticketOnly };
		await saveLocally();
		showTransitSettings = false;
	}

	function dismissRecompute() {
		showRecomputeConfirm = false;
	}

	function scheduleSave(fields: Record<string, string>) {
		clearTimeout(saveTimer);
		showStatus('saving');
		saveTimer = setTimeout(async () => {
			journey = {
				...journey,
				...(fields.title !== undefined ? { title: fields.title } : {}),
				...(fields.startDatetime !== undefined
					? { startDatetime: fields.startDatetime || null }
					: {})
			};
			await saveLocally();
		}, 250);
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

	function handleDndConsider(e: CustomEvent<{ items: (Stop & { id: number })[] }>) {
		dndItems = e.detail.items;
	}
	async function handleDndFinalize(e: CustomEvent<{ items: (Stop & { id: number })[] }>) {
		if (isReadOnly) return;
		dndItems = e.detail.items;
		journeyStops = dndItems.map((s, i) => ({ ...s, orderIndex: i }));
		rebuildLocalSegments(journeyStops);
		await saveLocally();
	}

	function addStop(insertIndex?: number) {
		insertAtIndex = insertIndex ?? null;
		locationPickerStop = null;
		showLocationPicker = true;
	}

	async function handleLocationConfirm(result: { name: string; lat: number; lon: number }) {
		if (isReadOnly) return;
		const orderIndex =
			insertAtIndex !== null
				? insertAtIndex
				: dndItems.length > 0
					? dndItems[dndItems.length - 1].orderIndex + 1
					: 0;
		const stop: Stop = {
			id: localStopId--,
			journeyId: journey.id,
			name: result.name,
			lat: result.lat,
			lon: result.lon,
			orderIndex,
			stayDurationMinutes: 60,
			notes: null
		};
		journeyStops = [
			...journeyStops.map((entry) =>
				entry.orderIndex >= orderIndex ? { ...entry, orderIndex: entry.orderIndex + 1 } : entry
			),
			stop
		];
		dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex);
		rebuildLocalSegments(journeyStops);
		await saveLocally();
	}

	async function updateStop(update: Partial<Stop> & { id: number }) {
		if (isReadOnly) return;
		journeyStops = journeyStops.map((stop) =>
			stop.id === update.id ? { ...stop, ...update } : stop
		);
		dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex);
		if (update.lat !== undefined || update.lon !== undefined) rebuildLocalSegments(journeyStops);
		await saveLocally();
		if (update.stayDurationMinutes !== undefined) scheduleTransitRecompute();
	}

	async function deleteStop(stopId: number) {
		if (isReadOnly) return;
		journeyStops = journeyStops
			.filter((stop) => stop.id !== stopId)
			.sort((a, b) => a.orderIndex - b.orderIndex)
			.map((stop, orderIndex) => ({ ...stop, orderIndex }));
		dndItems = [...journeyStops];
		rebuildLocalSegments(journeyStops);
		await saveLocally();
	}

	async function moveStop(stopId: number, direction: -1 | 1) {
		if (isReadOnly) return;
		const ordered = [...dndItems];
		const from = ordered.findIndex((s) => s.id === stopId);
		const to = from + direction;
		if (from < 0 || to < 0 || to >= ordered.length) return;
		[ordered[from], ordered[to]] = [ordered[to], ordered[from]];
		dndItems = ordered.map((stop, i) => ({ ...stop, orderIndex: i }));
		journeyStops = dndItems.map((stop) => ({ ...stop }));
		rebuildLocalSegments(journeyStops);
		await saveLocally();
	}

	function editStopLocation(stop: Stop) {
		locationPickerStop = stop;
		showLocationPicker = true;
	}
	async function handleLocationUpdateConfirm(result: { name: string; lat: number; lon: number }) {
		if (locationPickerStop) {
			await updateStop({
				id: locationPickerStop.id,
				name: result.name,
				lat: result.lat,
				lon: result.lon
			});
			locationPickerStop = null;
		}
	}

	async function changeSegmentMode(segmentId: number, mode: SegmentMode) {
		if (isReadOnly) return;
		journeySegments = journeySegments.map((segment) =>
			segment.id === segmentId
				? {
						...segment,
						mode,
						...(mode !== 'transit'
							? { transitLegs: null, transitSummary: null, transfers: null }
							: {})
					}
				: segment
		);
		await saveLocally();
		if (mode === 'transit')
			transitProviderError =
				'Public-transport connections are refreshed after you upload this local edit.';
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

	async function shiftTransitConnection(segment: Segment, direction: -1 | 1) {
		transitAlternativeError =
			'Alternative connections are searched after your local changes are uploaded.';
	}

	async function publishJourney() {
		await postAction('publish', {});
	}
	async function unpublishJourney() {
		shareUrl = null;
		await postAction('unpublish', {});
	}
	async function toggleJourneyComplete() {
		if (isReadOnly) return;
		journey = { ...journey, isCompleted: true };
		await saveLocally(true);
		celebrating = true;
		clearTimeout(celebrateTimer);
		celebrateTimer = setTimeout(() => (celebrating = false), 2600);
	}

	async function uploadLocalChanges() {
		if (isOffline || syncState === 'uploading') return;
		syncState = 'uploading';
		syncError = null;
		const form = new FormData();
		form.set('baseUpdatedAt', localBaseUpdatedAt ?? '');
		form.set('snapshot', JSON.stringify(snapshot()));
		const response = await fetch('?/replaceFromLocal', { method: 'POST', body: form });
		const result = deserialize(await response.text());
		if (result.type === 'failure') {
			const details = result.data as { conflict?: boolean; error?: string } | undefined;
			syncState = details?.conflict ? 'conflict' : 'local';
			syncError = details?.conflict
				? 'The cloud version changed after this local draft began. Uploading would overwrite it.'
				: (details?.error ?? 'Local changes could not be uploaded.');
			return;
		}
		if (result.type !== 'success') return;
		const payload = result.data as {
			journey?: typeof journey;
			stops?: Stop[];
			segments?: Segment[];
		};
		if (payload.journey) journey = payload.journey;
		if (payload.stops) journeyStops = payload.stops;
		if (payload.segments) journeySegments = payload.segments;
		dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex);
		localBaseUpdatedAt = journey.updatedAt;
		await clearLocalJourneyDraft(journey.id);
		await cacheJourney(journey.id, snapshot());
		syncState = 'synced';
		showStatus('saved');
	}

	async function abortLocalEdits() {
		clearTimeout(saveTimer);
		await clearLocalJourneyDraft(data.journey.id);
		journey = data.journey;
		journeyStops = data.stops as Stop[];
		journeySegments = data.segments as Segment[];
		dndItems = [...journeyStops].sort((a, b) => a.orderIndex - b.orderIndex);
		localBaseUpdatedAt = data.journey.updatedAt;
		syncState = 'synced';
		syncError = null;
		showStatus('idle');
	}
	function toggleMapMode() {
		showMap = !showMap;
	}
</script>

<svelte:head><title>{journey.title} — Journey Editor</title></svelte:head>

<OfflineBanner />

{#if showMap}
	{#await import('$lib/maps/JourneyMap.svelte') then { default: JourneyMap }}
		<JourneyMap
			stops={journeyStops}
			segments={journeySegments}
			onback={toggleMapMode}
			onupdatestop={isReadOnly ? undefined : updateStop}
		/>
	{/await}
{:else}
	<div class="travel-page" style="view-transition-name: journey-{journey.id}">
		<header
			class="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[#172a45]/45 bg-[#fffdf7]/95 px-4 py-3 backdrop-blur-lg"
		>
			<button class="btn btn-ghost btn-sm" onclick={() => goto('/')} aria-label="Back to journeys">
				<IconArrowBack class="h-5 w-5" />
			</button>
			<div class="min-w-0 flex-1 border-l-2 border-[#e6a527] pl-2.5">
				<p class="travel-eyebrow text-[9px]">Journey editor</p>
				{#if editingTitle && !isReadOnly}
					<input
						class="input input-bordered input-sm w-full max-w-xs border-[#172a45]/30"
						bind:value={titleInput}
						onblur={saveTitle}
						onkeydown={(e) => e.key === 'Enter' && saveTitle()}
					/>
				{:else if isReadOnly}
					<p class="travel-display truncate text-lg leading-tight text-[#172a45] sm:text-xl">
						{journey.title}
					</p>
				{:else}
					<button
						class="travel-display block max-w-full truncate text-left text-lg leading-tight text-[#172a45] hover:text-[#a45e38] sm:text-xl"
						onclick={() => (editingTitle = true)}>{journey.title}</button
					>
				{/if}
			</div>
			<input
				type="datetime-local"
				class="input input-bordered input-sm border-[#172a45]/30"
				value={startDatetime ? startDatetime.slice(0, 16) : ''}
				onchange={updateStartDatetime}
				disabled={isReadOnly}
				aria-label="Journey start"
			/>
			<button
				class="btn btn-sm gap-1.5 {journey.isCompleted
					? 'border-[#2f7d58] bg-[#2f7d58] text-white'
					: 'btn-ghost border border-[#172a45]/25'} {celebrating ? 'animate-soft-pop' : ''}"
				onclick={toggleJourneyComplete}
				aria-pressed={journey.isCompleted}
				disabled={isReadOnly}
			>
				<IconCheckCircle class="h-4 w-4" />
				<span class="hidden sm:inline">{journey.isCompleted ? 'Completed' : 'Mark completed'}</span>
			</button>
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => (showShareModal = true)}
				disabled={isReadOnly}
				title={isReadOnly ? 'Completed journeys are view only' : 'Share journey'}
				aria-label="Share journey"
			>
				<IconShare class="h-5 w-5" />
			</button>
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => (showTransitSettings = true)}
				aria-label="Transit settings"
				disabled={isReadOnly}
			>
				<IconTune class="h-5 w-5" />
			</button>
			<button class="btn btn-ghost btn-sm" onclick={toggleMapMode} aria-label="Open map">
				<IconMap class="h-5 w-5" />
			</button>
			<SaveStatus status={saveStatus} />
		</header>

		<main class="mx-auto max-w-2xl p-4 sm:p-5">
			{#if isReadOnly}
				<div
					class="mb-4 flex items-start gap-3 border border-l-4 border-[#2f7d58]/35 border-l-[#2f7d58] bg-[#f1f6f1] px-3 py-3 text-sm text-[#245e44]"
				>
					<IconCheckCircle class="mt-0.5 h-5 w-5 shrink-0" />
					<div>
						<strong class="travel-display text-base">Completed journey</strong>
						<p class="mt-0.5 text-xs text-[#245e44]/80">
							This trip is preserved as a view-only record.
						</p>
					</div>
				</div>
			{:else if syncState !== 'synced'}
				<div
					class="mb-4 border border-l-4 border-[#172a45]/25 border-l-[#e6a527] bg-[#f4eee0] px-3 py-3 text-sm text-[#172a45]"
				>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<strong
								>{syncState === 'conflict'
									? 'Cloud version changed'
									: 'Changes saved locally'}</strong
							>
							<p class="mt-0.5 text-xs text-[#172a45]/65">
								{syncState === 'conflict'
									? 'Choose whether to overwrite the cloud with this local draft or abandon your local edits.'
									: 'This device has the newest edit. Upload when you are ready.'}
							</p>
						</div>
						<div class="flex gap-2">
							<button
								class="btn btn-primary btn-sm"
								onclick={uploadLocalChanges}
								disabled={syncState === 'uploading' || isOffline}
								>{syncState === 'uploading' ? 'Uploading…' : 'Upload changes'}</button
							>
							<button
								class="btn btn-ghost btn-sm"
								onclick={abortLocalEdits}
								disabled={syncState === 'uploading'}>Abort edits</button
							>
						</div>
					</div>
					{#if syncError}<p class="mt-2 border-t border-[#172a45]/15 pt-2 text-xs text-[#a45e38]">
							{syncError}
						</p>{/if}
				</div>
			{/if}
			{#if transitProviderError}
				<div
					class="mb-4 flex items-start justify-between gap-3 border border-[#a45e38]/35 bg-[#a45e38]/10 px-3 py-2.5 text-sm text-[#713a22]"
				>
					<p>{transitProviderError}</p>
					<button
						class="btn btn-ghost btn-xs btn-square"
						aria-label="Dismiss transit notice"
						onclick={() => (transitProviderError = null)}>×</button
					>
				</div>
			{/if}
			{#if dndItems.length > 0}
				<section
					class="animate-fade-in-up mb-4 border border-t-4 border-[#172a45]/35 border-t-[#e6a527] bg-[#fffdf7] px-4 py-3"
				>
					<div class="flex items-baseline justify-between gap-3">
						<p class="travel-eyebrow text-[9px]">Route overview</p>
						<p class="travel-folio text-xs text-[#a45e38]">
							{formatDuration(overview.total)} end to end
						</p>
					</div>
					<div class="mt-2 flex items-center gap-2">
						<span class="h-2 w-2 shrink-0 rounded-full bg-[#172a45]"></span>
						<span class="travel-display min-w-0 truncate text-base text-[#172a45]"
							>{dndItems[0].name}</span
						>
						<span class="h-px min-w-3 flex-1 bg-[#e6a527]"></span>
						<span class="h-2 w-2 shrink-0 rounded-full bg-[#e6a527]"></span>
						<span class="travel-display min-w-0 truncate text-base text-[#172a45]"
							>{dndItems[dndItems.length - 1].name}</span
						>
					</div>
					<div
						class="travel-eyebrow mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[#172a45]/55"
					>
						<span>{dndItems.length} {dndItems.length === 1 ? 'stop' : 'stops'}</span>
						<span>{formatDuration(overview.travel)} travelling</span>
						<span>{formatDuration(overview.stays)} staying</span>
						{#if overview.distance > 0}<span>{formatDistance(overview.distance)}</span>{/if}
					</div>
				</section>
			{:else}
				<div
					class="flex flex-col items-center gap-3 border border-dashed border-[#172a45]/30 bg-[#fffdf7]/70 py-12 text-center"
				>
					<IconPin class="h-10 w-10 text-[#a45e38]/60" />
					<p class="travel-display text-lg text-[#172a45]">A blank itinerary</p>
					<p class="text-xs text-[#172a45]/55">Add your first stop to begin plotting the route.</p>
				</div>
			{/if}

			<div
				use:dragHandleZone={{
					items: dndItems,
					flipDurationMs: 200,
					dragDisabled: isReadOnly,
					dropTargetStyle: { outline: '2px dashed #a45e38', borderRadius: '0' },
					transformDraggedElement
				}}
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
										readonly={isReadOnly}
										onmodechange={isReadOnly ? undefined : changeSegmentMode}
										onclickdetail={openSegmentDetail}
										loading={computingSegmentId === seg.id}
										oninsert={isReadOnly ? undefined : () => addStop(stop.orderIndex)}
									/>
								{:else if !isReadOnly}
									<div class="flex justify-center py-1">
										<button
											class="btn btn-ghost btn-xs gap-0.5"
											onclick={() => addStop(stop.orderIndex)}
										>
											<IconAdd class="h-3.5 w-3.5" /> Insert stop
										</button>
									</div>
								{/if}
							</div>
						{/if}

						<StopCard
							{stop}
							index={i}
							total={dndItems.length}
							arrivalTime={arrivalTimes[i] ?? null}
							readonly={isReadOnly}
							onupdate={isReadOnly ? undefined : updateStop}
							ondelete={isReadOnly ? undefined : deleteStop}
							onpicklocation={isReadOnly ? undefined : editStopLocation}
							onmove={isReadOnly ? undefined : (direction) => moveStop(stop.id, direction)}
						/>
					</div>
				{/each}
			</div>

			{#if !isReadOnly}<div class="mt-5 flex justify-center border-t border-[#172a45]/25 pt-4">
					<button class="btn btn-primary btn-sm sm:btn-md gap-1.5" onclick={() => addStop()}>
						<IconAdd class="h-5 w-5" /> Add Stop
					</button>
				</div>{/if}
		</main>
	</div>
{/if}

{#if celebrating}
	<div
		class="animate-soft-pop pointer-events-none fixed bottom-6 left-1/2 z-[2600] -translate-x-1/2 border border-l-4 border-[#172a45]/45 border-l-[#e6a527] bg-[#fffdf7] px-4 py-2.5 shadow-[6px_7px_0_rgba(23,42,69,0.18)]"
		role="status"
	>
		<span class="animate-sparkle mr-1.5 text-base text-[#e6a527]">✦</span>
		<span class="travel-display text-base text-[#172a45]">Journey complete — nicely done.</span>
	</div>
{/if}

{#if browser && showLocationPicker}
	{#await import('$lib/maps/LocationPicker.svelte') then { default: LocationPicker }}
		<LocationPicker
			bind:open={showLocationPicker}
			initialLat={locationPickerStop?.lat ?? 50}
			initialLon={locationPickerStop?.lon ?? 8}
			onconfirm={locationPickerStop ? handleLocationUpdateConfirm : handleLocationConfirm}
		/>
	{/await}
{/if}

{#if !isReadOnly}<ShareModal
		bind:open={showShareModal}
		journeyTitle={journey.title}
		isPublic={journey.isPublic}
		{shareUrl}
		onpublish={publishJourney}
		onunpublish={unpublishJourney}
	/>
{/if}

<TransitDetailModal
	bind:open={showTransitDetail}
	segment={detailSegment}
	readonly={isReadOnly}
	fromCoords={transitFromCoords}
	toCoords={transitToCoords}
	onwalkclick={handleTransitWalkClick}
	onconnectionchange={isReadOnly ? undefined : shiftTransitConnection}
	connectionError={transitAlternativeError}
	{changingConnection}
/>

<Modal bind:open={showTransitSettings} title="Transit settings" icon={IconTune} size="sm">
	<div class="space-y-5">
		<p class="text-base-content/60 text-sm">
			Use a minimum buffer for every interchange. Updating this value recalculates confirmed
			public-transport segments.
		</p>
		<label class="block space-y-3" for="minimum-transfer-time">
			<span class="flex items-baseline justify-between gap-4 text-sm font-semibold"
				><span>Minimum transfer time</span><strong class="travel-display text-xl text-[#172a45]"
					>{minimumTransferMinutes} min</strong
				></span
			>
			<input
				id="minimum-transfer-time"
				class="range range-primary w-full"
				type="range"
				min="0"
				max="30"
				step="1"
				bind:value={minimumTransferMinutes}
			/>
		</label>
		<label
			class="flex cursor-pointer items-start justify-between gap-4 border-t border-[#172a45]/15 pt-4"
			for="deutschlandticket-only"
		>
			<span
				><span class="block text-sm font-semibold">Deutschlandticket only</span><span
					class="text-base-content/60 mt-1 block text-xs"
					>Exclude ICE, IC, EC and other non-ticket long-distance services.</span
				></span
			>
			<input
				id="deutschlandticket-only"
				class="toggle toggle-primary shrink-0"
				type="checkbox"
				bind:checked={deutschlandticketOnly}
			/>
		</label>
		<button
			class="btn btn-primary w-full"
			onclick={saveTransitSettings}
			disabled={savingTransitSettings}
			>{savingTransitSettings ? 'Updating connections…' : 'Save and update connections'}</button
		>
	</div>
</Modal>

{#if browser && showWalkRoute}
	{#await import('$lib/journeys/WalkRouteModal.svelte') then { default: WalkRouteModal }}
		<WalkRouteModal
			bind:open={showWalkRoute}
			segment={detailSegment}
			fromName={walkFromName}
			toName={walkToName}
		/>
	{/await}
{/if}

{#if showRecomputeConfirm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Update connections"
		tabindex="-1"
		onclick={dismissRecompute}
		onkeydown={(e) => e.key === 'Escape' && dismissRecompute()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-base-100 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<div class="mb-3 flex items-center gap-3">
				<IconTrain class="text-primary h-6 w-6" />
				<h3 class="text-base font-bold">Update Öffi connections?</h3>
			</div>
			<p class="text-base-content/60 mb-4 text-sm">
				You changed the timing of your journey. Want to search for new Öffi connections that match
				the updated schedule?
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost btn-sm" onclick={dismissRecompute}>Keep current</button>
				<button
					class="btn btn-primary btn-sm"
					onclick={confirmRecomputeTransit}
					disabled={isRecomputing}
				>
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
