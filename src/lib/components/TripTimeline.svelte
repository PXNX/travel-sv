<!-- src/lib/components/TripTimeline.svelte -->
<script lang="ts">
	import type { TripStop, TravelTip, TransportSegment } from '$lib/types';
	import { categoryInfo, transportInfo } from '$lib/types';
	import { formatDuration } from '$lib/utils/calculations';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconArrowDown from '~icons/fluent/arrow-down-24-filled';

	interface Props {
		stops: (TripStop & { location?: TravelTip })[];
		startTime?: string; // HH:mm
		oneditduration: (tipId: number, currentDuration: number) => void;
		onedittransport: (stopIndex: number, fromLocation: string, toLocation: string) => void;
		onremove: (tipId: number) => void;
	}

	let { stops, startTime = '09:00', oneditduration, onedittransport, onremove }: Props = $props();

	// Calculate cumulative times for the timeline
	function getTimelineData() {
		let currentMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

		return stops.map((stop, index) => {
			const arrivalMinutes = currentMinutes;
			const stayDuration = stop.customDuration || stop.location?.durationMinutes || 60;
			const departureMinutes = arrivalMinutes + stayDuration;

			const result = {
				arrivalTime: formatTime(arrivalMinutes),
				departureTime: formatTime(departureMinutes),
				stayDuration
			};

			// Add transport time for next segment
			if (index < stops.length - 1) {
				const nextStop = stops[index + 1];
				currentMinutes = departureMinutes + (nextStop.transport?.durationMinutes || 0);
			}

			return result;
		});
	}

	function formatTime(minutes: number): string {
		const hours = Math.floor(minutes / 60) % 24;
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
	}

	const timelineData = $derived(getTimelineData());
</script>

<div class="space-y-0">
	{#each stops as stop, index (stop.tipId)}
		{@const location = stop.location!}
		{@const timing = timelineData[index]}

		<div class="relative">
			<!-- Location Stop -->
			<div class="flex gap-3">
				<!-- Timeline Line -->
				<div class="flex flex-col items-center">
					<div
						class="flex size-10 items-center justify-center rounded-full text-lg font-bold text-white"
						style="background-color: {categoryInfo[location.category].color}"
					>
						{index + 1}
					</div>
					{#if index < stops.length - 1}
						<div class="bg-base-300 min-h-[60px] w-0.5 flex-1"></div>
					{/if}
				</div>

				<!-- Location Card -->
				<div class="card bg-base-100 mb-3 flex-1 shadow">
					<div class="card-body p-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="text-lg">{categoryInfo[location.category].icon}</span>
									<h3 class="text-sm font-bold">{location.title}</h3>
								</div>

								<div class="text-base-content/70 mt-2 space-y-1 text-xs">
									<div class="flex items-center gap-2">
										<IconClock class="size-3" />
										<span>Arrive: <strong>{timing.arrivalTime}</strong></span>
										<span>•</span>
										<span>Depart: <strong>{timing.departureTime}</strong></span>
									</div>
									<div class="flex items-center gap-2">
										<span>Stay: <strong>{formatDuration(timing.stayDuration)}</strong></span>
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => oneditduration(location.id, timing.stayDuration)}
										>
											<IconEdit class="size-3" />
										</button>
									</div>
								</div>
							</div>

							<button
								class="btn btn-ghost btn-xs btn-square text-error"
								onclick={() => onremove(location.id)}
							>
								<IconDelete class="size-4" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Transport Segment -->
			{#if index < stops.length - 1}
				{@const nextStop = stops[index + 1]}
				{@const transport = nextStop.transport}

				<div class="mb-3 flex gap-3">
					<div class="flex w-10 justify-center">
						<IconArrowDown class="text-base-content/30 size-5" />
					</div>

					<button
						class="card bg-base-200 hover:bg-base-300 flex-1 cursor-pointer transition-colors"
						onclick={() =>
							onedittransport(index + 1, location.title, nextStop.location?.title || '')}
					>
						<div class="card-body p-3">
							{#if transport}
								<div class="flex items-center gap-3">
									<span class="text-2xl">{transportInfo[transport.mode].icon}</span>
									<div class="flex-1 text-sm">
										<div class="font-medium">{transportInfo[transport.mode].label}</div>
										<div class="text-base-content/70 flex items-center gap-2 text-xs">
											{#if transport.departureTime && transport.arrivalTime}
												<span>{transport.departureTime} → {transport.arrivalTime}</span>
												<span>•</span>
											{/if}
											<span>{formatDuration(transport.durationMinutes)}</span>
											{#if transport.routeName}
												<span>•</span>
												<span class="font-medium">{transport.routeName}</span>
											{/if}
										</div>
										{#if transport.notes}
											<div class="text-base-content/60 mt-1 text-xs italic">
												{transport.notes}
											</div>
										{/if}
									</div>
									<IconEdit class="size-4 opacity-50" />
								</div>
							{:else}
								<div class="text-base-content/50 flex items-center gap-2 text-sm">
									<span>Click to add transportation</span>
									<IconEdit class="size-4" />
								</div>
							{/if}
						</div>
					</button>
				</div>
			{/if}
		</div>
	{/each}
</div>
