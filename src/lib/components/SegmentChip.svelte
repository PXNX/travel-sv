<script lang="ts">
	import type { Segment, SegmentMode } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
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

	let { segment, onmodechange, onclickdetail, oninsert, readonly = false, loading = false }: Props = $props();

	const modes: { value: SegmentMode; label: string }[] = [
		{ value: 'walk', label: 'Walk' },
		{ value: 'transit', label: 'Öffi' },
		{ value: 'drive', label: 'Drive' }
	];

	const modeColors: Record<SegmentMode, { border: string; bg: string; dot: string }> = {
		walk: { border: 'border-green-500/40', bg: 'bg-green-500/10', dot: 'bg-green-500' },
		transit: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
		drive: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', dot: 'bg-amber-500' }
	};

	const colors = $derived(modeColors[segment.mode] ?? modeColors.walk);
</script>

{#snippet modeIcon(mode: SegmentMode, cls: string)}
	{#if mode === 'walk'}
		<IconWalk class={cls} />
	{:else if mode === 'transit'}
		<IconTrain class={cls} />
	{:else}
		<IconCar class={cls} />
	{/if}
{/snippet}

<div class="my-1.5 mx-1">
	<div class="flex items-stretch gap-0">
		<div class="flex flex-col items-center w-8 shrink-0">
			<div class="w-0.5 h-2 bg-base-300"></div>
			<div class="w-2.5 h-2.5 rounded-full {colors.dot}"></div>
			<div class="w-0.5 flex-1 bg-base-300"></div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="rounded-xl border {colors.border} {colors.bg} px-3 py-2 flex flex-col gap-1.5">

				{#if !readonly && onmodechange}
					<div class="flex gap-0.5 rounded-lg bg-base-100/60 p-0.5 self-start">
						{#each modes as m}
							<button
								class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
								class:bg-primary={segment.mode === m.value}
								class:text-primary-content={segment.mode === m.value}
								class:shadow-sm={segment.mode === m.value}
								class:hover:bg-base-300={segment.mode !== m.value}
								disabled={loading}
								title={m.label}
								onclick={() => onmodechange(segment.id, m.value)}
							>
								{@render modeIcon(m.value, 'h-3.5 w-3.5')}
								{m.label}
							</button>
						{/each}
					</div>
				{/if}

				{#if loading}
					<div class="flex items-center gap-2 py-1">
						<span class="loading loading-spinner loading-xs"></span>
						<span class="text-xs text-base-content/50">Computing…</span>
					</div>
				{:else}
					<button
						class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left w-full group"
						class:cursor-pointer={!!onclickdetail}
						class:hover:opacity-80={!!onclickdetail}
						disabled={!onclickdetail}
						onclick={() => onclickdetail?.(segment)}
					>
						{#if readonly}
							{@render modeIcon(segment.mode, 'h-4 w-4')}
						{/if}

						{#if segment.mode === 'walk'}
							{#if segment.distanceM}
								<span class="text-xs font-semibold">{formatDistance(segment.distanceM)}</span>
							{/if}
							{#if segment.elevationUpM || segment.elevationDownM}
								<span class="text-xs text-base-content/50">↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">map ›</span>
							{/if}

						{:else if segment.mode === 'transit'}
							{#if segment.transfers != null}
								<span class="text-xs font-semibold">{segment.transfers === 0 ? 'Direkt' : `${segment.transfers}× Umstieg`}</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">details ›</span>
							{/if}

						{:else}
							{#if segment.distanceM}
								<span class="text-xs font-semibold">{formatDistance(segment.distanceM)}</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">map ›</span>
							{/if}
						{/if}
					</button>
				{/if}
			</div>

			{#if oninsert && !readonly}
				<div class="flex justify-center -mt-0.5">
					<button class="btn btn-ghost btn-xs text-[10px] opacity-30 hover:opacity-100 transition-opacity gap-0.5" onclick={oninsert}>
						<IconAdd class="h-3 w-3" /> insert stop
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
