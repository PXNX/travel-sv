<script lang="ts">
	import type { Segment, TransitLeg } from '$lib/types';
	import { formatDuration } from '$lib/helpers';

	interface Props {
		open: boolean;
		segment: Segment | null;
		onclose?: () => void;
	}

	let { open = $bindable(false), segment, onclose }: Props = $props();

	const legs = $derived((segment?.transitLegs ?? []) as TransitLeg[]);
	const transfers = $derived(segment?.transfers ?? 0);
	const walkTo = $derived(segment?.walkToStationMin ?? 0);
	const walkFrom = $derived(segment?.walkFromStationMin ?? 0);

	function fmtTime(iso?: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}

	function close() { open = false; onclose?.(); }
</script>

{#if open && segment}
	<!-- backdrop -->
	<div class="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/50" onclick={close}>
		<!-- modal -->
		<div
			class="bg-base-100 w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85dvh] animate-slide-up"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- header -->
			<div class="flex items-center justify-between border-b border-base-300 px-5 py-3">
				<div>
					<h3 class="font-bold text-base">Transit Details</h3>
					<p class="text-xs text-base-content/50">
						{segment.transitSummary ?? 'Connection'} ·
						{formatDuration(segment.travelDurationMinutes ?? 0)} total ·
						{transfers} {transfers === 1 ? 'transfer' : 'transfers'}
					</p>
				</div>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={close}>✕</button>
			</div>

			<!-- scrollable body -->
			<div class="overflow-y-auto flex-1 px-5 py-4">
				<!-- walk to station -->
				{#if walkTo > 0}
					<div class="flex gap-3 items-start pb-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm">🚶</div>
							<div class="w-0.5 flex-1 bg-base-300 mt-1"></div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium">Walk to station</p>
							<p class="text-xs text-base-content/50">~{formatDuration(walkTo)}</p>
						</div>
					</div>
				{/if}

				<!-- legs -->
				{#each legs as leg, i}
					<div class="flex gap-3 items-start pb-3">
						<div class="flex flex-col items-center">
							{#if leg.type === 'walking'}
								<div class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm">🚶</div>
							{:else}
								<div class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px] font-bold leading-none">
									{leg.product ?? '🚆'}
								</div>
							{/if}
							{#if i < legs.length - 1}
								<div class="w-0.5 flex-1 mt-1" class:bg-primary={leg.type === 'transport'} class:bg-base-300={leg.type === 'walking'}></div>
							{/if}
						</div>

						<div class="flex-1 min-w-0 pt-0.5">
							{#if leg.type === 'walking'}
								<p class="text-sm text-base-content/60">Walk · {formatDuration(leg.durationMinutes)}</p>
								{#if leg.departureStation && leg.arrivalStation}
									<p class="text-xs text-base-content/40 truncate">{leg.departureStation} → {leg.arrivalStation}</p>
								{/if}
							{:else}
								<div class="flex items-center gap-2">
									<span class="badge badge-sm badge-primary font-mono">{leg.lineName}</span>
									{#if leg.direction}
										<span class="text-xs text-base-content/40 truncate">→ {leg.direction}</span>
									{/if}
								</div>

								<!-- departure -->
								<div class="mt-1.5 flex items-center gap-2 text-sm">
									<span class="font-mono font-semibold text-sm">{fmtTime(leg.departure)}</span>
									<span class="truncate">{leg.departureStation}</span>
									{#if leg.platform}
										<span class="badge badge-xs badge-outline">Gl. {leg.platform}</span>
									{/if}
								</div>

								<!-- duration bar -->
								<div class="ml-[18px] border-l-2 border-primary/30 pl-3 py-1.5">
									<span class="text-xs text-base-content/40">{formatDuration(leg.durationMinutes)}</span>
								</div>

								<!-- arrival -->
								<div class="flex items-center gap-2 text-sm">
									<span class="font-mono font-semibold text-sm">{fmtTime(leg.arrival)}</span>
									<span class="truncate">{leg.arrivalStation}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- walk from station -->
				{#if walkFrom > 0}
					<div class="flex gap-3 items-start">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm">🚶</div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium">Walk from station</p>
							<p class="text-xs text-base-content/50">~{formatDuration(walkFrom)}</p>
						</div>
					</div>
				{/if}

				{#if legs.length === 0}
					<p class="text-sm text-base-content/50 text-center py-6">No detailed leg data available for this connection.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
