<script lang="ts">
	import type { Segment, SegmentMode } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import { Button, Segmented, SEGMENT_MODE_STYLES, transitColor } from '$lib/components/ui';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconCar from '~icons/material-symbols/directions-car-outline-rounded';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';

	interface Props {
		segment: Segment;
		onmodechange?: (segmentId: number, mode: SegmentMode) => void;
		onclickdetail?: (segment: Segment) => void;
		oninsert?: () => void;
		readonly?: boolean;
		loading?: boolean;
	}

	let {
		segment,
		onmodechange,
		onclickdetail,
		oninsert,
		readonly = false,
		loading = false
	}: Props = $props();

	const MODE_ICONS = { walk: IconWalk, transit: IconTrain, drive: IconCar };
	const modes: { value: SegmentMode; label: string; icon: (typeof MODE_ICONS)[SegmentMode] }[] = [
		{ value: 'walk', label: 'Walk', icon: IconWalk },
		{ value: 'transit', label: 'Öffi', icon: IconTrain },
		{ value: 'drive', label: 'Drive', icon: IconCar }
	];

	const colors = $derived(SEGMENT_MODE_STYLES[segment.mode] ?? SEGMENT_MODE_STYLES.walk);
	const ModeIcon = $derived(MODE_ICONS[segment.mode] ?? IconWalk);
	const detailHint = $derived(segment.mode === 'transit' ? 'connection' : 'route');
	const transitLines = $derived(
		(segment.transitLegs ?? []).filter((leg) => leg.type === 'transport')
	);
	const hasConfirmedTransit = $derived(transitLines.length > 0);
</script>

<div class="mx-1 my-1 flex items-stretch gap-2">
	<!-- connection spine -->
	<div class="flex w-8 shrink-0 flex-col items-center pt-1">
		<span class="h-2 w-px bg-[#172a45]/20"></span>
		<span class="size-2.5 rounded-full border border-[#172a45]/40 {colors.dot}"></span>
		<span class="w-px flex-1 bg-[#172a45]/20"></span>
	</div>

	<div class="min-w-0 flex-1">
		<div class="border px-3 py-2 {colors.border} {colors.bg}">
			{#if !readonly && onmodechange}
				<div class="mb-1.5">
					<Segmented
						options={modes}
						value={segment.mode}
						disabled={loading}
						ariaLabel="Travel mode"
						onchange={(mode) => onmodechange(segment.id, mode)}
					/>
				</div>
			{/if}

			{#if loading}
				<div class="flex items-center gap-2 py-1">
					<span class="loading loading-spinner loading-xs text-[#a45e38]"></span>
					<span class="text-[11px] text-[#172a45]/50">Computing connection…</span>
				</div>
			{:else}
				<button
					class="group flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-left"
					class:cursor-pointer={!!onclickdetail}
					disabled={!onclickdetail}
					onclick={() => onclickdetail?.(segment)}
				>
					<ModeIcon class="size-4 shrink-0 text-[#172a45]/70" />

					{#if segment.mode === 'transit'}
						{#if hasConfirmedTransit && segment.transfers != null}
							<span class="text-[11px] font-bold text-[#172a45]">
								{segment.transfers === 0 ? 'Direct' : `${segment.transfers}× transfer`}
							</span>
							{#each transitLines as line, index (index)}
								<span
									class="border px-1.5 py-0.5 text-[10px] leading-none font-bold text-white"
									style={`background:${transitColor(line.product)}`}
								>
									{line.lineName ?? line.product ?? 'ÖPNV'}
								</span>
							{/each}
						{:else}
							<span class="text-[11px] font-semibold text-[#a83a2b]">No confirmed connection</span>
						{/if}
					{:else if segment.distanceM}
						<span class="text-[11px] font-bold text-[#172a45]"
							>{formatDistance(segment.distanceM)}</span
						>
					{/if}

					{#if segment.mode === 'walk' && (segment.elevationUpM || segment.elevationDownM)}
						<span class="text-[10px] text-[#172a45]/50">
							↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m
						</span>
					{/if}

					{#if segment.travelDurationMinutes}
						<span class="travel-folio text-[11px] text-[#a45e38]"
							>~{formatDuration(segment.travelDurationMinutes)}</span
						>
					{/if}

					{#if onclickdetail}
						<span
							class="ml-auto inline-flex items-center gap-0.5 text-[10px] font-bold tracking-wide text-[#a45e38] uppercase opacity-0 transition-opacity group-hover:opacity-100"
						>
							{detailHint}
							<IconChevronRight class="size-3" />
						</span>
					{/if}
				</button>
			{/if}
		</div>

		{#if oninsert && !readonly}
			<div class="-mt-px flex justify-center">
				<Button
					variant="ghost"
					size="xs"
					icon={IconAdd}
					class="text-[10px] text-[#a45e38]/60 transition-opacity hover:opacity-100"
					onclick={oninsert}
				>
					insert stop
				</Button>
			</div>
		{/if}
	</div>
</div>
