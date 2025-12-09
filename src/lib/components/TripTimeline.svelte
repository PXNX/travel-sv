<!-- src/lib/components/TripTimeline.svelte -->
<script lang="ts">
	import type { TripStop, TravelTip } from '$lib/types';
	import { categoryInfo, transportInfo } from '$lib/types';
	import { formatDuration } from '$lib/utils/calculations';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconFoodApple from '~icons/fluent-emoji/fork-and-knife-with-plate';
	import IconMuseum from '~icons/fluent-emoji/classical-building';
	import IconLeisure from '~icons/fluent-emoji/bed';
	import IconNature from '~icons/fluent-emoji/evergreen-tree';
	import IconTrain from '~icons/fluent-emoji/locomotive';
	import IconBus from '~icons/fluent-emoji/bus';
	import IconWalking from '~icons/fluent-emoji/person-walking';
	import Modal from './Modal.svelte';

	interface Props {
		stops: (TripStop & { location?: TravelTip })[];
		startTime?: string;
		oneditduration: (tipId: number, currentDuration: number) => void;
		onedittransport: (stopIndex: number, fromLocation: string, toLocation: string) => void;
		onremove: (tipId: number) => void;
	}

	let { stops, startTime = '09:00', oneditduration, onedittransport, onremove }: Props = $props();

	let showDeleteStopDialog = $state(false);
	let stopToDelete: number | null = $state(null);

	const categoryIcons = {
		food: IconFoodApple,
		museum: IconMuseum,
		leisure: IconLeisure,
		nature: IconNature
	};

	const transportIcons = {
		railway: IconTrain,
		bus: IconBus,
		walking: IconWalking
	};

	function confirmRemoveStop(tipId: number) {
		stopToDelete = tipId;
		showDeleteStopDialog = true;
	}

	function handleRemoveStop() {
		if (stopToDelete !== null) {
			onremove(stopToDelete);
			stopToDelete = null;
		}
		showDeleteStopDialog = false;
	}

	function getTimelineData() {
		let currentMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

		return stops.map((stop, index) => {
			const arrivalMinutes = currentMinutes;
			const stayDuration = stop.customDuration || stop.location?.durationMinutes || 60;
			const departureMinutes = arrivalMinutes + stayDuration;

			const result = {
				arrivalTime: formatTime(arrivalMinutes),
				departureTime: formatTime(departureMinutes),
				stayDuration,
				arrivalMinutes,
				departureMinutes
			};

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

<div class="relative space-y-0">
	{#each stops as stop, index (stop.tipId)}
		{@const location = stop.location!}
		{@const timing = timelineData[index]}
		{@const CategoryIcon = categoryIcons[location.category]}

		<div class="relative flex gap-4">
			<!-- Timeline Line (Left Side) -->
			<div class="flex flex-col items-center">
				<div
					class="flex size-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
					style="background-color: {categoryInfo[location.category].color}"
				>
					{index + 1}
				</div>
				{#if index < stops.length - 1}
					<div
						class="w-1 flex-1 rounded-full"
						style="background-color: {categoryInfo[location.category]
							.color}; opacity: 0.3; min-height: 120px;"
					></div>
				{/if}
			</div>

			<!-- Location Card -->
			<div
				class="card bg-base-100 mb-4 flex-1 cursor-pointer shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
				onclick={() => oneditduration(location.id, timing.stayDuration)}
			>
				<div class="card-body p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<div
									class="flex size-8 items-center justify-center rounded-lg"
									style="background-color: {categoryInfo[location.category].color}; opacity: 0.15;"
								>
									<svelte:component this={CategoryIcon} class="size-5" />
								</div>
								<div class="flex-1">
									<h3 class="text-base font-bold">{location.title}</h3>
									<span
										class="badge badge-sm"
										style="background-color: {categoryInfo[location.category].color}; color: white;"
									>
										{categoryInfo[location.category].label}
									</span>
								</div>
							</div>

							<div class="text-base-content/70 mt-3 space-y-2 text-sm">
								<div class="flex items-center gap-2">
									<IconClock class="size-4 flex-shrink-0" />
									<span>
										<strong>{timing.arrivalTime}</strong> - <strong>{timing.departureTime}</strong>
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span>Duration: <strong>{formatDuration(timing.stayDuration)}</strong></span>
									<IconEdit class="size-3 opacity-50" />
								</div>
							</div>
						</div>

						<button
							class="btn btn-ghost btn-sm btn-square text-error z-10"
							onclick={(e) => {
								e.stopPropagation();
								confirmRemoveStop(location.id);
							}}
						>
							<IconDelete class="size-5" />
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Transport Segment -->
		{#if index < stops.length - 1}
			{@const nextStop = stops[index + 1]}
			{@const transport = nextStop.transport}
			{@const nextTiming = timelineData[index + 1]}
			{@const TransportIcon = transport ? transportIcons[transport.mode] : null}

			<div class="relative mb-4 flex gap-4">
				<div class="w-10 flex-shrink-0"></div>

				<button
					class="card bg-base-200 hover:bg-base-300 flex-1 cursor-pointer transition-colors"
					onclick={() => onedittransport(index + 1, location.title, nextStop.location?.title || '')}
				>
					<div class="card-body p-4">
						{#if transport}
							<div class="flex items-center gap-3">
								<div
									class="flex size-10 items-center justify-center rounded-lg"
									style="background-color: {transportInfo[transport.mode].color}; opacity: 0.15;"
								>
									<svelte:component this={TransportIcon} class="size-6" />
								</div>
								<div class="flex-1">
									<div class="font-semibold" style="color: {transportInfo[transport.mode].color}">
										{transportInfo[transport.mode].label}
									</div>
									<div class="text-base-content/70 flex flex-wrap items-center gap-2 text-sm">
										<span>{timing.departureTime} → {nextTiming.arrivalTime}</span>
										<span>•</span>
										<span>{formatDuration(transport.durationMinutes)}</span>
										{#if transport.distanceKm}
											<span>•</span>
											<span>{transport.distanceKm.toFixed(1)} km</span>
										{/if}
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
								<IconEdit class="size-4 flex-shrink-0 opacity-50" />
							</div>
						{:else}
							<div class="text-base-content/50 flex items-center justify-between">
								<span class="text-sm">Click to add transportation</span>
								<IconEdit class="size-4" />
							</div>
						{/if}
					</div>
				</button>
			</div>
		{/if}
	{/each}
</div>

<Modal bind:open={showDeleteStopDialog} title="Remove Stop?">
	<div class="space-y-4">
		<p class="text-base-content/80 text-sm">
			Are you sure you want to remove this location from your trip?
		</p>

		<div class="modal-action mt-6 flex gap-2 sm:gap-3">
			<button
				class="btn btn-ghost btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={() => {
					showDeleteStopDialog = false;
					stopToDelete = null;
				}}
			>
				Cancel
			</button>
			<button
				class="btn btn-error btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={handleRemoveStop}
			>
				<IconDismiss class="size-4 sm:size-5" />
				Remove
			</button>
		</div>
	</div>
</Modal>
