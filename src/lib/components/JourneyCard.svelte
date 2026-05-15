<script lang="ts">
	import type { JourneyWithDerived } from '$lib/types';
	import { formatDuration } from '$lib/helpers';

	import IconCalendar from '~icons/material-symbols/calendar-today-outline-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconClock from '~icons/material-symbols/timer-outline-rounded';
	import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
	import IconLink from '~icons/material-symbols/link-rounded';

	interface Props {
		journey: JourneyWithDerived;
		onclick?: (journey: JourneyWithDerived) => void;
		style?: string;
	}

	let { journey, onclick, style = '' }: Props = $props();

	const startDateFormatted = $derived(
		journey.startDatetime
			? new Date(journey.startDatetime).toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})
			: null
	);

	const routeLabel = $derived(() => {
		if (journey.firstStopName && journey.lastStopName) {
			return `${journey.firstStopName} → ${journey.lastStopName}`;
		}
		if (journey.firstStopName) return journey.firstStopName;
		return null;
	});

	const hasCoords = $derived((journey.stopCoords?.length ?? 0) > 0);
</script>

<button
	class="card bg-base-200 w-full cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden text-left"
	onclick={() => onclick?.(journey)}
	{style}
>
	<div class="flex">
		{#if hasCoords}
			<div class="relative flex w-28 shrink-0 items-center justify-center overflow-hidden bg-base-300/50 sm:w-36">
				{#await import('./MiniMap.svelte') then { default: MiniMap }}
					<MiniMap coords={journey.stopCoords!} class="h-full w-full" />
				{/await}
				<div class="absolute inset-0 bg-gradient-to-r from-transparent to-base-200/30"></div>
			</div>
		{/if}

		<div class="flex flex-1 flex-col gap-2 p-4">
			<div>
				<div class="flex items-center gap-2">
					<h2 class="text-base font-bold leading-tight">{journey.title}</h2>
					{#if journey.isPublic}
						<span class="badge badge-success badge-xs gap-1 shrink-0">
							<IconLink class="h-3 w-3" />
							Public
						</span>
					{/if}
				</div>
				{#if routeLabel()}
					<p class="text-base-content/50 mt-0.5 text-sm leading-snug">{routeLabel()}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{#if startDateFormatted}
					<div class="flex items-center gap-1 text-xs text-base-content/60">
						<IconCalendar class="h-3.5 w-3.5" />
						<span>{startDateFormatted}</span>
					</div>
				{/if}
				{#if journey.stopCount > 0}
					<div class="flex items-center gap-1 text-xs text-base-content/60">
						<IconPin class="h-3.5 w-3.5" />
						<span>{journey.stopCount} {journey.stopCount === 1 ? 'stop' : 'stops'}</span>
					</div>
				{/if}
				{#if journey.totalDurationMinutes > 0}
					<div class="flex items-center gap-1 text-xs text-base-content/60">
						<IconClock class="h-3.5 w-3.5" />
						<span>{formatDuration(journey.totalDurationMinutes)}</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="flex items-center pr-3 text-base-content/20">
			<IconChevronRight class="h-5 w-5" />
		</div>
	</div>
</button>
