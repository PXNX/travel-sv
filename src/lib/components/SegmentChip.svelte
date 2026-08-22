<script lang="ts">
	import type { Segment, SegmentMode } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import { Button, Segmented, SEGMENT_MODE_STYLES, transitColor } from '$lib/components/ui';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconCar from '~icons/material-symbols/directions-car-outline-rounded';
	import IconAdd from '~icons/material-symbols/add-rounded';

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
	const detailHint = $derived(segment.mode === 'transit' ? 'details ›' : 'map ›');
	const hasConfirmedTransit = $derived((segment.transitLegs ?? []).some((leg) => leg.type === 'transport'));
	const transitLines = $derived((segment.transitLegs ?? []).filter((leg) => leg.type === 'transport'));
</script>

<div class="mx-1 my-1.5">
	<div class="flex items-stretch gap-0">
		<div class="flex w-8 shrink-0 flex-col items-center">
			<div class="bg-base-300 h-2 w-0.5"></div>
			<div class="size-2.5 rounded-full {colors.dot}"></div>
			<div class="bg-base-300 w-0.5 flex-1"></div>
		</div>

		<div class="min-w-0 flex-1">
			<div class="flex flex-col gap-1.5 rounded-xl border px-3 py-2 {colors.border} {colors.bg}">
				{#if !readonly && onmodechange}
					<Segmented
						options={modes}
						value={segment.mode}
						disabled={loading}
						ariaLabel="Travel mode"
						onchange={(mode) => onmodechange(segment.id, mode)}
					/>
				{/if}

				{#if loading}
					<div class="flex items-center gap-2 py-1">
						<span class="loading loading-spinner loading-xs"></span>
						<span class="text-base-content/50 text-xs">Computing…</span>
					</div>
				{:else}
					<button
						class="group flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 text-left"
						class:cursor-pointer={!!onclickdetail}
						class:hover:opacity-80={!!onclickdetail}
						disabled={!onclickdetail}
						onclick={() => onclickdetail?.(segment)}
					>
						{#if readonly}
							<ModeIcon class="size-4 shrink-0" />
						{/if}

						{#if segment.mode === 'transit'}
							{#if hasConfirmedTransit && segment.transfers != null}
								<span class="text-xs font-semibold">
									{segment.transfers === 0 ? 'Direkt' : `${segment.transfers}× Umstieg`}
								</span>
								{#each transitLines as line, index (index)}
									<span class="rounded px-1.5 py-0.5 text-[10px] leading-none font-bold text-white" style={`background:${transitColor(line.product)}`}>
										{line.lineName ?? line.product ?? 'ÖPNV'}
									</span>
								{/each}
							{:else}
								<span class="text-warning text-xs font-semibold">Keine bestätigte Verbindung</span>
							{/if}
						{:else if segment.distanceM}
							<span class="text-xs font-semibold">{formatDistance(segment.distanceM)}</span>
						{/if}

						{#if segment.mode === 'walk' && (segment.elevationUpM || segment.elevationDownM)}
							<span class="text-base-content/50 text-xs">
								↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m
							</span>
						{/if}

						{#if segment.travelDurationMinutes}
							<span class="text-base-content/60 text-xs">
								~{formatDuration(segment.travelDurationMinutes)}
							</span>
						{/if}

						{#if onclickdetail}
							<span
								class="text-primary ml-auto text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
							>
								{detailHint}
							</span>
						{/if}
					</button>
				{/if}
			</div>

			{#if oninsert && !readonly}
				<div class="-mt-0.5 flex justify-center">
					<Button
						variant="ghost"
						size="xs"
						icon={IconAdd}
						class="text-[10px] opacity-30 transition-opacity hover:opacity-100"
						onclick={oninsert}
					>
						insert stop
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
