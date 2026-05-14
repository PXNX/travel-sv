<script lang="ts">
	import type { Segment, SegmentMode } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';

	interface Props {
		segment: Segment;
		onmodechange?: (segmentId: number, mode: SegmentMode) => void;
		onclickdetail?: (segment: Segment) => void;
		oninsert?: () => void;
		readonly?: boolean;
		loading?: boolean;
	}

	let { segment, onmodechange, onclickdetail, oninsert, readonly = false, loading = false }: Props = $props();

	const modes: { value: SegmentMode; icon: string; label: string }[] = [
		{ value: 'walk', icon: '🚶', label: 'Walk' },
		{ value: 'transit', icon: '🚆', label: 'Öffi' },
		{ value: 'drive', icon: '🚗', label: 'Drive' }
	];

	const currentMode = $derived(modes.find((m) => m.value === segment.mode)!);
</script>

<div class="my-1.5 mx-1">
	<!-- connector line -->
	<div class="flex items-stretch gap-0">
		<!-- vertical line + dot -->
		<div class="flex flex-col items-center w-8 shrink-0">
			<div class="w-0.5 h-2 bg-base-300"></div>
			<div class="w-2 h-2 rounded-full bg-base-300"></div>
			<div class="w-0.5 flex-1 bg-base-300"></div>
		</div>

		<!-- card -->
		<div class="flex-1 min-w-0">
			<div class="rounded-xl border border-base-300 bg-base-200/50 px-3 py-2 flex flex-col gap-1.5">

				<!-- mode picker (edit mode only) -->
				{#if !readonly && onmodechange}
					<div class="flex gap-0.5 rounded-lg bg-base-300/50 p-0.5 self-start">
						{#each modes as m}
							<button
								class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
								class:bg-primary={segment.mode === m.value}
								class:text-primary-content={segment.mode === m.value}
								class:shadow-sm={segment.mode === m.value}
								class:hover:bg-base-300={segment.mode !== m.value}
								disabled={loading}
								title={m.label}
								onclick={() => onmodechange(segment.id, m.value)}
							>
								{m.icon} {m.label}
							</button>
						{/each}
					</div>
				{/if}

				<!-- info row — clickable for walk (map) and transit (detail) -->
				{#if loading}
					<div class="flex items-center gap-2 py-1">
						<span class="loading loading-spinner loading-xs"></span>
						<span class="text-xs text-base-content/50">Computing route…</span>
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
							<span class="text-sm">{currentMode.icon}</span>
						{/if}

						{#if segment.mode === 'walk'}
							<!-- Walk: distance · elevation · duration -->
							{#if segment.distanceM}
								<span class="text-xs font-semibold">{formatDistance(segment.distanceM)}</span>
							{/if}
							{#if segment.elevationUpM || segment.elevationDownM}
								<span class="text-xs text-base-content/50">
									↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m
								</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">show map ›</span>
							{/if}

						{:else if segment.mode === 'transit'}
							<!-- Transit: summary · transfers · duration -->
							{#if segment.transitSummary}
								<span class="text-xs font-semibold">{segment.transitSummary}</span>
							{/if}
							{#if segment.transfers != null && segment.transfers > 0}
								<span class="badge badge-xs badge-outline">{segment.transfers}× transfer</span>
							{/if}
							{#if segment.walkToStationMin}
								<span class="text-[10px] text-base-content/40">🚶{Math.round(segment.walkToStationMin)}′→</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if segment.walkFromStationMin}
								<span class="text-[10px] text-base-content/40">→🚶{Math.round(segment.walkFromStationMin)}′</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">details ›</span>
							{/if}

						{:else}
							<!-- Drive: distance · duration (no elevation) -->
							{#if segment.distanceM}
								<span class="text-xs font-semibold">{formatDistance(segment.distanceM)}</span>
							{/if}
							{#if segment.travelDurationMinutes}
								<span class="text-xs text-base-content/60">~{formatDuration(segment.travelDurationMinutes)}</span>
							{/if}
							{#if onclickdetail}
								<span class="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">show map ›</span>
							{/if}
						{/if}
					</button>
				{/if}
			</div>

			<!-- insert stop button -->
			{#if oninsert && !readonly}
				<div class="flex justify-center -mt-0.5">
					<button class="btn btn-ghost btn-xs text-[10px] opacity-30 hover:opacity-100 transition-opacity" onclick={oninsert}>
						＋ insert stop
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
