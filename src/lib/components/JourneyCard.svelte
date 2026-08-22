<script lang="ts">
	// Papier & Tinte: a journey card as a printed route slip with a quiet map inset.
	import type { JourneyWithDerived } from '$lib/types';
	import { formatDuration } from '$lib/helpers';
	import { browser } from '$app/environment';
	import { Card, MetaItem } from '$lib/components/ui';

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

	const routeLabel = $derived(
		journey.firstStopName && journey.lastStopName
			? `${journey.firstStopName} → ${journey.lastStopName}`
			: (journey.firstStopName ?? null)
	);

	const hasCoords = $derived((journey.stopCoords?.length ?? 0) > 0);
</script>

<Card
	interactive
	padding="none"
	style="view-transition-name: journey-{journey.id}; {style}"
	onclick={() => onclick?.(journey)}
>
	<div class="flex">
		{#if browser && hasCoords}
			<div
					class="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-[#172a45]/20 bg-[#e7ddca] sm:w-36"
			>
				{#await import('./MiniMap.svelte') then { default: MiniMap }}
					<MiniMap coords={journey.stopCoords!} class="h-full w-full" />
				{/await}
					<div class="absolute inset-0 bg-gradient-to-r from-transparent to-[#fffdf7]/35"></div>
			</div>
		{/if}

		<div class="flex flex-1 flex-col gap-2 p-4">
			<div>
				<div class="flex items-center gap-2">
						<h2 class="travel-display text-lg leading-tight text-[#172a45]">{journey.title}</h2>
					{#if journey.isPublic}
						<span class="badge badge-success badge-xs shrink-0 gap-1">
							<IconLink class="size-3" />
							Public
						</span>
					{/if}
				</div>
				{#if routeLabel}
						<p class="mt-0.5 text-sm leading-snug text-[#a45e38]">{routeLabel}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{#if startDateFormatted}
					<MetaItem icon={IconCalendar}>{startDateFormatted}</MetaItem>
				{/if}
				{#if journey.stopCount > 0}
					<MetaItem icon={IconPin}>
						{journey.stopCount}
						{journey.stopCount === 1 ? 'stop' : 'stops'}
					</MetaItem>
				{/if}
				{#if journey.totalDurationMinutes > 0}
					<MetaItem icon={IconClock}>{formatDuration(journey.totalDurationMinutes)}</MetaItem>
				{/if}
			</div>
		</div>

			<div class="flex items-center pr-3 text-[#172a45]/35">
			<IconChevronRight class="size-5" />
		</div>
	</div>
</Card>
