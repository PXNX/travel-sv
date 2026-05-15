<script lang="ts">
	import type { PageData } from './$types';
	import type { Stop, Segment } from '$lib/types';
	import { computeDerivedArrivalTimes, formatDuration } from '$lib/helpers';
	import SegmentChip from '$lib/components/SegmentChip.svelte';
	import { enhance } from '$app/forms';
	import IconClock from '~icons/material-symbols/schedule-outline-rounded';
	import IconDownload from '~icons/material-symbols/download-rounded';

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

	function findSegment(fromId: number, toId: number): Segment | undefined {
		return journeySegments.find((s) => s.fromStopId === fromId && s.toStopId === toId);
	}
</script>

<svelte:head><title>{journey.title} — Shared Journey</title></svelte:head>

<div class="min-h-[100dvh] bg-base-100">
	<header class="flex items-center justify-between border-b border-base-300 px-4 py-3">
		<div>
			<h1 class="text-lg font-bold">{journey.title}</h1>
			<p class="text-xs text-base-content/50">by {journey.ownerName}</p>
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

		{#each sortedStops as stop, i (stop.id)}
			{#if i > 0}
				{@const seg = findSegment(sortedStops[i - 1].id, stop.id)}
				{#if seg}
					<SegmentChip segment={seg} readonly />
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
