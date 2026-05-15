<script lang="ts">
	import type { PageData } from './$types';
	import type { Stop, Segment } from '$lib/types';
	import { computeDerivedArrivalTimes, formatDuration, formatDistance } from '$lib/helpers';
	import SegmentChip from '$lib/components/SegmentChip.svelte';
	import TransitDetailModal from '$lib/components/TransitDetailModal.svelte';
	import { enhance } from '$app/forms';
	import IconClock from '~icons/material-symbols/schedule-outline-rounded';
	import IconDownload from '~icons/material-symbols/download-rounded';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconTimer from '~icons/material-symbols/timer-outline-rounded';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';

	let { data }: { data: PageData } = $props();

	let journey = $derived(data.journey);
	let sortedStops = $derived([...(data.stops as Stop[])].sort((a, b) => a.orderIndex - b.orderIndex));
	let journeySegments = $derived(data.segments as Segment[]);

	const arrivalTimes = $derived(
		computeDerivedArrivalTimes(
			data.stops as Stop[],
			journeySegments,
			journey.startDatetime ? new Date(journey.startDatetime) : null
		)
	);

	let isImporting = $state(false);

	let showTransitDetail = $state(false);
	let showWalkRoute = $state(false);
	let detailSegment = $state<Segment | null>(null);
	let walkFromName = $state('');
	let walkToName = $state('');

	const startTime = $derived(arrivalTimes[0] ?? null);
	const endTime = $derived(
		arrivalTimes.length > 0 ? arrivalTimes[arrivalTimes.length - 1] : null
	);
	const totalDurationMin = $derived(
		startTime && endTime
			? (endTime.getTime() - startTime.getTime()) / 60000
			: null
	);
	const totalWalkDistanceM = $derived(
		journeySegments
			.filter((s) => s.mode === 'walk')
			.reduce((sum, s) => sum + (s.distanceM ?? 0), 0)
	);
	const spansMultipleDays = $derived(
		startTime && endTime
			? startTime.toDateString() !== endTime.toDateString()
			: false
	);

	function fmtTime(date: Date): string {
		if (spansMultipleDays) {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
				', ' +
				date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}

	function findSegment(fromId: number, toId: number): Segment | undefined {
		return journeySegments.find((s) => s.fromStopId === fromId && s.toStopId === toId);
	}

	function stopName(id: number): string {
		return sortedStops.find((s) => s.id === id)?.name ?? '';
	}

	const transitFromCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = sortedStops.find(s => s.id === detailSegment!.fromStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	const transitToCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = sortedStops.find(s => s.id === detailSegment!.toStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

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
</script>

<svelte:head><title>{journey.title} — Shared Journey</title></svelte:head>

<div class="min-h-[100dvh] bg-base-100">
	<header class="flex items-center justify-between border-b border-base-300 px-4 py-3">
		<div class="flex items-center gap-2">
			<a href="/" class="btn btn-ghost btn-sm">
				<IconArrowBack class="h-5 w-5" />
			</a>
			<div>
				<h1 class="text-lg font-bold">{journey.title}</h1>
				<p class="text-xs text-base-content/50">by {journey.ownerName}</p>
			</div>
		</div>

		<form method="POST" action="?/import" use:enhance={() => {
			isImporting = true;
			return async ({ update }) => { await update(); isImporting = false; };
		}}>
			<button class="btn btn-primary btn-sm gap-1.5" disabled={isImporting}>
				{#if isImporting}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<IconDownload class="h-4 w-4" />
					Import
				{/if}
			</button>
		</form>
	</header>

	<main class="mx-auto max-w-2xl p-4">
		{#if journey.description}
			<p class="mb-4 text-sm text-base-content/70">{journey.description}</p>
		{/if}

		{#if sortedStops.length > 0 || (startTime && endTime && totalDurationMin != null)}
	<div class="mb-4 overflow-hidden rounded-xl border border-base-300">
		{#if sortedStops.length > 0}
			<div class="h-40 pointer-events-none select-none" aria-hidden="true">
				{#await import('$lib/components/MiniMap.svelte') then { default: MiniMap }}
					<MiniMap coords={sortedStops.map(s => ({ lat: s.lat, lon: s.lon }))} class="h-full w-full" />
				{/await}
			</div>
		{/if}

		{#if startTime && endTime && totalDurationMin != null}
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 bg-base-200/50 px-4 py-2.5 text-sm">
				<span class="flex items-center gap-1.5 text-base-content/70">
					<IconClock class="h-4 w-4 shrink-0" />
					{fmtTime(startTime)} – {fmtTime(endTime)}
				</span>
				<span class="text-base-content/30">·</span>
				<span class="flex items-center gap-1.5 text-base-content/70">
					<IconTimer class="h-4 w-4 shrink-0" />
					{formatDuration(totalDurationMin)}
				</span>
				{#if totalWalkDistanceM > 0}
					<span class="text-base-content/30">·</span>
					<span class="flex items-center gap-1.5 text-base-content/70">
						<IconWalk class="h-4 w-4 shrink-0" />
						{formatDistance(totalWalkDistanceM)}
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}

		{#each sortedStops as stop, i (stop.id)}
			{#if i > 0}
				{@const seg = findSegment(sortedStops[i - 1].id, stop.id)}
				{#if seg}
					<SegmentChip segment={seg} readonly onclickdetail={openSegmentDetail} />
				{/if}
			{/if}

			<div class="card bg-base-200 mb-1 shadow-sm">
				<div class="card-body gap-1 p-3">
					<div class="flex items-center gap-2">
						<span class="badge badge-primary badge-sm">{i + 1}</span>
						<span class="font-semibold">{stop.name}</span>
					</div>

					{#if arrivalTimes[i]}
						<span class="flex items-center gap-1 text-xs text-base-content/50">
							<IconClock class="h-3.5 w-3.5" />
							{arrivalTimes[i]?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
						</span>
					{/if}

					{#if stop.stayDurationMinutes}
						<span class="text-xs text-base-content/60">
							Stay: {formatDuration(stop.stayDurationMinutes)}
						</span>
					{/if}

					{#if stop.notes}
						<p class="text-xs text-base-content/50 mt-1">{stop.notes}</p>
					{/if}
				</div>
			</div>
		{/each}
	</main>
	</div>

	<TransitDetailModal bind:open={showTransitDetail} segment={detailSegment} fromCoords={transitFromCoords} toCoords={transitToCoords} onwalkclick={handleTransitWalkClick} />

	{#await import('$lib/components/WalkRouteModal.svelte') then { default: WalkRouteModal }}
	<WalkRouteModal bind:open={showWalkRoute} segment={detailSegment} fromName={walkFromName} toName={walkToName} />
	{/await}
