<script lang="ts">
	import type { PageData } from './$types';
	import type { Stop, Segment } from '$lib/types';
	import { computeDerivedArrivalTimes, formatDuration, formatDistance } from '$lib/helpers';
	import SegmentChip from '$lib/journeys/SegmentChip.svelte';
	import TransitDetailModal from '$lib/journeys/TransitDetailModal.svelte';
	import { PageHeader } from '$lib/ui';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import IconClock from '~icons/material-symbols/schedule-outline-rounded';
	import IconDownload from '~icons/material-symbols/download-rounded';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconTimer from '~icons/material-symbols/timer-outline-rounded';
	import IconLink from '~icons/material-symbols/link-rounded';
	import IconCheck from '~icons/material-symbols/check-rounded';

	let { data }: { data: PageData } = $props();

	let journey = $derived(data.journey);
	let sortedStops = $derived(
		[...(data.stops as Stop[])].sort((a, b) => a.orderIndex - b.orderIndex)
	);
	let journeySegments = $derived(data.segments as Segment[]);

	const arrivalTimes = $derived(
		computeDerivedArrivalTimes(
			data.stops as Stop[],
			journeySegments,
			journey.startDatetime ? new Date(journey.startDatetime) : null
		)
	);

	let isImporting = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout>;

	let showTransitDetail = $state(false);
	let showWalkRoute = $state(false);
	let detailSegment = $state<Segment | null>(null);
	let walkFromName = $state('');
	let walkToName = $state('');

	const startTime = $derived(arrivalTimes[0] ?? null);
	const endTime = $derived(arrivalTimes.length > 0 ? arrivalTimes[arrivalTimes.length - 1] : null);
	const totalDurationMin = $derived(
		startTime && endTime ? (endTime.getTime() - startTime.getTime()) / 60000 : null
	);
	const totalWalkDistanceM = $derived(
		journeySegments.filter((s) => s.mode === 'walk').reduce((sum, s) => sum + (s.distanceM ?? 0), 0)
	);
	const spansMultipleDays = $derived(
		startTime && endTime ? startTime.toDateString() !== endTime.toDateString() : false
	);

	const facts = $derived([
		{
			icon: IconClock,
			value: startTime && endTime ? `${fmtTime(startTime)} – ${fmtTime(endTime)}` : 'Times not set'
		},
		{
			icon: IconTimer,
			value: totalDurationMin != null ? formatDuration(totalDurationMin) : 'Duration open'
		},
		...(totalWalkDistanceM > 0
			? [{ icon: IconWalk, value: formatDistance(totalWalkDistanceM) }]
			: [])
	]);

	function fmtTime(date: Date): string {
		if (spansMultipleDays) {
			return (
				date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
				', ' +
				date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
			);
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
		const stop = sortedStops.find((s) => s.id === detailSegment!.fromStopId);
		return stop ? [stop.lat, stop.lon] : undefined;
	});

	const transitToCoords = $derived.by((): [number, number] | undefined => {
		if (!detailSegment) return undefined;
		const stop = sortedStops.find((s) => s.id === detailSegment!.toStopId);
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

	async function copyLink() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1800);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>{journey.title} — Shared Journey</title></svelte:head>

<div class="travel-page">
	<PageHeader title={journey.title} subtitle={`Shared by ${journey.ownerName ?? 'a traveller'}`}>
		{#snippet actions()}
			<div class="flex items-center gap-1">
				<button
					class="btn btn-ghost btn-sm"
					onclick={copyLink}
					aria-label="Copy link to this journey"
				>
					{#if copied}
						<IconCheck class="h-4 w-4 text-[#2f7d58]" />
					{:else}
						<IconLink class="h-4 w-4" />
					{/if}
					<span class="hidden md:inline">{copied ? 'Copied' : 'Copy link'}</span>
				</button>
				<form
					method="POST"
					action="?/import"
					use:enhance={() => {
						isImporting = true;
						return async ({ update }) => {
							await update();
							isImporting = false;
						};
					}}
				>
					<button class="btn btn-primary btn-sm gap-1.5" disabled={isImporting}>
						{#if isImporting}
							<span class="loading loading-spinner loading-xs"></span>
						{:else}
							<IconDownload class="h-4 w-4" />
						{/if}
						Import
					</button>
				</form>
			</div>
		{/snippet}
	</PageHeader>

	<main class="mx-auto max-w-2xl p-4 sm:p-5">
		{#if journey.description}
			<p class="travel-folio animate-glide-in mb-4 text-sm text-[#a45e38]">{journey.description}</p>
		{/if}

		{#if sortedStops.length > 0 || (startTime && endTime && totalDurationMin != null)}
			<section
				class="animate-fade-in-up mb-5 border border-t-4 border-[#172a45]/35 border-t-[#e6a527] bg-[#fffdf7]"
			>
				{#if browser && sortedStops.length > 0}
					<div
						class="pointer-events-none h-40 border-b border-[#172a45]/20 select-none"
						aria-hidden="true"
					>
						{#await import('$lib/maps/MiniMap.svelte') then { default: MiniMap }}
							<MiniMap
								coords={sortedStops.map((s) => ({ lat: s.lat, lon: s.lon }))}
								class="h-full w-full"
							/>
						{/await}
					</div>
				{/if}

				{#if startTime && endTime && totalDurationMin != null}
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
						{#each facts as fact (fact.value)}
							<span class="inline-flex items-center gap-1.5 text-xs font-medium text-[#172a45]/65">
								<fact.icon class="h-4 w-4 shrink-0 text-[#a45e38]" />
								{fact.value}
							</span>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<div class="flex flex-col gap-0">
			{#each sortedStops as stop, i (stop.id)}
				<div class="flex gap-2.5">
					<div class="flex w-8 shrink-0 flex-col items-center pt-2">
						<span
							class="travel-display animate-soft-pop flex h-8 w-8 items-center justify-center border border-[#172a45]/45 bg-[#fffdf7] text-base text-[#172a45]"
						>
							{i + 1}
						</span>
						{#if i < sortedStops.length - 1}<span class="w-px flex-1 bg-[#e6a527]/60"></span>{/if}
					</div>

					<div class="min-w-0 flex-1 border border-[#172a45]/30 bg-[#fffdf7] px-3.5 py-2.5">
						<div class="flex items-baseline justify-between gap-3">
							<h2 class="travel-display truncate text-[17px] text-[#172a45]">{stop.name}</h2>
							{#if arrivalTimes[i]}
								<span class="travel-eyebrow shrink-0 text-[9px]">
									{arrivalTimes[i]?.toLocaleTimeString('en-US', {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>
							{/if}
						</div>
						{#if stop.stayDurationMinutes}
							<p class="mt-1 text-[11px] text-[#172a45]/55">
								Stay · {formatDuration(stop.stayDurationMinutes)}
							</p>
						{/if}
						{#if stop.notes}
							<p
								class="mt-1 border-l-2 border-[#e6a527] pl-2 text-[11px] leading-relaxed text-[#172a45]/65"
							>
								{stop.notes}
							</p>
						{/if}
					</div>
				</div>

				{#if i > 0}
					{@const seg = findSegment(sortedStops[i - 1].id, stop.id)}
					{#if seg}
						<div class="ml-10">
							<SegmentChip segment={seg} readonly onclickdetail={openSegmentDetail} />
						</div>
					{/if}
				{/if}
			{/each}
		</div>
	</main>
</div>

<TransitDetailModal
	bind:open={showTransitDetail}
	segment={detailSegment}
	readonly
	fromCoords={transitFromCoords}
	toCoords={transitToCoords}
	onwalkclick={handleTransitWalkClick}
/>

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
