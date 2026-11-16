<script lang="ts">
	// A printed route slip: map inset, route endpoints and a quiet footer of facts.
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
		index?: number;
	}

	let { journey, onclick, style = '', index = 0 }: Props = $props();

	const startDateFormatted = $derived(
		journey.startDatetime
			? new Date(journey.startDatetime).toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})
			: 'Date open'
	);

	const hasCoords = $derived((journey.stopCoords?.length ?? 0) > 0);
	const completed = $derived(journey.isCompleted === true);
</script>

<Card
	interactive
	padding="none"
	style="view-transition-name: journey-{journey.id}; {style}"
	onclick={() => onclick?.(journey)}
	class="group"
>
	<div class="flex">
		<!-- folio index -->
		<div
			class="hidden w-9 shrink-0 flex-col items-center justify-between border-r border-[#172a45]/15 bg-[#f4eee0] py-3 sm:flex"
		>
			<span class="travel-display text-lg text-[#172a45]/35"
				>{String(index + 1).padStart(2, '0')}</span
			>
			<span class="h-8 w-px bg-[#e6a527]"></span>
			<span
				class="rotate-180 text-[9px] font-bold tracking-widest text-[#a45e38]"
				style="writing-mode: vertical-rl">ROUTE</span
			>
		</div>

		{#if browser && hasCoords}
			<div
				class="relative w-24 shrink-0 overflow-hidden border-r border-[#172a45]/20 bg-[#e7ddca] sm:w-32"
			>
				{#await import('./MiniMap.svelte') then { default: MiniMap }}
					<MiniMap coords={journey.stopCoords!} class="h-full w-full" />
				{/await}
				<div class="absolute inset-0 bg-gradient-to-r from-transparent to-[#fffdf7]/40"></div>
			</div>
		{/if}

		<div class="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<p class="travel-eyebrow text-[9px]">{startDateFormatted}</p>
					<h2 class="travel-display truncate text-xl leading-tight text-[#172a45]">
						{journey.title}
					</h2>
				</div>
				<div class="flex shrink-0 items-center gap-1">
					{#if journey.isPublic}
						<span
							class="inline-flex items-center gap-0.5 border border-[#2f7d58]/40 bg-[#2f7d58]/8 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#2f7d58] uppercase"
						>
							<IconLink class="size-2.5" /> Public
						</span>
					{/if}
					{#if completed}
						<span
							class="border border-[#172a45]/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#172a45]/60 uppercase"
							>Done</span
						>
					{/if}
				</div>
			</div>

			<!-- route endpoints -->
			<div class="flex items-center gap-2 text-[12px] text-[#a45e38]">
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#172a45]"></span>
				<span class="min-w-0 truncate">{journey.firstStopName ?? 'No stops yet'}</span>
				<span
					class="h-px min-w-3 flex-1 bg-[#e6a527] transition-all duration-300 group-hover:min-w-6"
				></span>
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e6a527]"></span>
				<span class="min-w-0 truncate">{journey.lastStopName ?? '—'}</span>
			</div>

			<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
				{#if journey.stopCount > 0}
					<MetaItem icon={IconPin}
						>{journey.stopCount} {journey.stopCount === 1 ? 'stop' : 'stops'}</MetaItem
					>
				{/if}
				{#if journey.totalDurationMinutes > 0}
					<MetaItem icon={IconClock}>{formatDuration(journey.totalDurationMinutes)}</MetaItem>
				{/if}
				<MetaItem icon={IconCalendar} class="sm:hidden">{startDateFormatted}</MetaItem>
			</div>
		</div>

		<div
			class="flex items-center pr-3 text-[#172a45]/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#a45e38]"
		>
			<IconChevronRight class="size-5" />
		</div>
	</div>
</Card>
