<!-- src/lib/components/TripTimeline.svelte -->
<script lang="ts">
	/**
	 * TripTimeline Component
	 * 
	 * Properly calculates timeline with cumulative time tracking:
	 * Example: Start at 8:00 at Location 1
	 * - Stay 1h at Location 1 (8:00 - 9:00)
	 * - Walk 30min to Location 2 (9:00 - 9:30)
	 * - Arrive at Location 2 at 9:30
	 * - Stay 45min at Location 2 (9:30 - 10:15)
	 * - Public transport search should start at 10:15
	 * 
	 * The transport duration includes:
	 * - Walking time from location to station
	 * - Waiting time at station
	 * - Travel time on train/bus
	 * - Walking time from station to destination
	 */
	import type { TripStop, TravelTip } from '$lib/types';
	import { categoryInfo, transportInfo } from '$lib/types';
	import { formatDuration } from '$lib/utils/calculations';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconShare from '~icons/fluent/share-24-regular';

	import Modal from './Modal.svelte';

	interface Props {
		stops: (TripStop & { location?: TravelTip })[];
		startTime?: string;
		tripName?: string;
		oneditduration: (tipId: number, currentDuration: number) => void;
		onedittransport: (stopIndex: number, fromLocation: string, toLocation: string) => void;
		onremove: (tipId: number) => void;
		onshare?: () => void;
	}

	let { stops, startTime = '09:00', tripName, oneditduration, onedittransport, onremove, onshare }: Props = $props();

	let showDeleteStopDialog = $state(false);
	let stopToDelete: number | null = $state(null);

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

			// Calculate time for next location
			if (index < stops.length - 1) {
				const nextStop = stops[index + 1];
				const transport = nextStop.transport;
				
				if (transport) {
					// Add transport duration to get to next location
					currentMinutes = departureMinutes + transport.durationMinutes;
				} else {
					// No transport specified, assume next location is reached immediately
					currentMinutes = departureMinutes;
				}
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

	function extractCityFromAddress(address: string): string {
		// Try to extract city/town name from address
		// Address format is typically: "Street HouseNumber PostalCode City"
		const parts = address.split(',').map(p => p.trim());
		
		if (parts.length > 1) {
			// If address has commas, the city is usually the last or second-to-last part
			return parts[parts.length - 1];
		}
		
		// If no commas, try to find the city after postal code
		const tokens = address.split(' ');
		let foundPostalCode = false;
		
		for (let i = 0; i < tokens.length; i++) {
			// German postal codes are 5 digits
			if (/^\d{5}$/.test(tokens[i])) {
				foundPostalCode = true;
				// Return everything after the postal code
				if (i + 1 < tokens.length) {
					return tokens.slice(i + 1).join(' ');
				}
			}
		}
		
		// If no postal code found, return last 1-2 words as city name
		if (tokens.length >= 2) {
			return tokens.slice(-2).join(' ');
		}
		
		return '';
	}
</script>

<div class="relative space-y-0">
	<!-- Share Button -->
	{#if onshare && stops.length > 0}
		<div class="mb-4 flex justify-end">
			<button
				class="btn btn-primary btn-sm gap-2"
				onclick={onshare}
			>
				<IconShare class="size-4" />
				Share Trip
			</button>
		</div>
	{/if}

	{#each stops as stop, index (stop.tipId)}
		{@const location = stop.location!}
		{@const timing = timelineData[index]}
		{@const categoryStyle = categoryInfo[location.category]}

		<div class="relative flex gap-4">
			<!-- Location Card -->
			<div
				class="card bg-base-100 mb-4 flex-1 cursor-pointer shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
				onclick={() => oneditduration(location.id, timing.stayDuration)}
				style="background-color: {categoryStyle.color}"
			>
				<div class="card-body p-4">
					<div class="flex items-start justify-between gap-3">
						<!-- Timeline Circle (Left Side) -->
						<div class="flex flex-col items-center">
							<div
								class="flex size-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
								style="background-color: {categoryStyle.color}"
							>
								{index + 1}
							</div>

							<categoryStyle.icon class="size-6" />
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<div class="flex-1">
									<h3 class="text-base font-bold">{location.title}</h3>
									{#if location.address}
										{@const city = extractCityFromAddress(location.address)}
										{#if city}
											<p class="text-base-content/60 mt-0.5 text-xs">{city}</p>
										{/if}
									{/if}
								</div>
							</div>

							<div class="text-base-content/70 mt-3 space-y-2 text-sm">
								<div class="flex items-center gap-2">
									<IconClock class="size-4 flex-shrink-0" />
									<span>
										<strong>{timing.arrivalTime}</strong> → <strong>{timing.departureTime}</strong>
									</span>
									<span class="text-base-content/50">•</span>
									<span><strong>{formatDuration(timing.stayDuration)}</strong></span>
								</div>
							</div>
						</div>

						<button
							class="btn btn-ghost btn-sm btn-square z-10 text-white"
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
			{@const nextTiming = timelineData[index + 1]}
			{@const transport = nextStop.transport}
			{@const transportStyle = transport ? transportInfo[transport?.mode] : null}
			{@const nextLocation = nextStop.location!}

			<div class="relative mb-4 flex gap-4">
				<!-- Dashed line for transport -->
				<div class="flex w-10 flex-col items-center">
					<div class="relative w-1 flex-1" style="min-height: 80px;">
						<div
							class="absolute inset-0 w-1 rounded-full"
							style="background: repeating-linear-gradient(to bottom, {transportStyle
								? transportStyle.color
								: '#94a3b8'} 0px, {transportStyle
								? transportStyle.color
								: '#94a3b8'} 8px, transparent 8px, transparent 16px); opacity: 0.5;"
						></div>
					</div>
				</div>

				<button
					class="card bg-base-200 hover:bg-base-300 w-full cursor-pointer transition-colors"
					onclick={() => onedittransport(index + 1, location.title, nextStop.location?.title || '')}
				>
					<div class="card-body p-4">
						{#if transport}
							<div class="flex items-center gap-3">
								<div
									class="flex size-8 items-center justify-center rounded-lg"
									style="background-color: {transportStyle?.color}; "
								>
									<transportStyle.icon class="size-5" />
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="text-base font-semibold" style="color: {transportStyle.color}">
											{transport.label}
										</span>
										{#if nextStop.transport.routeName && nextStop.transport.mode !== 'walking'}
											<span
												class="badge badge-sm"
												style="background-color: {transportStyle.color}; color: white;"
											>
												{nextStop.transport.routeName}
											</span>
										{/if}
									</div>
									<div class="text-base-content/70 mt-1 flex flex-wrap items-center gap-2 text-sm">
										<IconClock class="size-4 flex-shrink-0" />
										<!-- Show start time (departure from previous location) -->
										<span
											><strong>{timing.departureTime}</strong></span
										>
										{#if nextStop.transport.arrivalTime}
											<span>→</span>
											<span><strong>{nextStop.transport.arrivalTime}</strong></span>
										{/if}
										<span>•</span>
										<span
											><strong>{formatDuration(nextStop.transport.durationMinutes)}</strong></span
										>
										{#if nextStop.transport.distanceKm}
											<span>•</span>
											<span>{nextStop.transport.distanceKm.toFixed(1)} km</span>
										{/if}
										{#if nextStop.transport.transfers !== undefined && nextStop.transport.transfers > 0}
											<span>•</span>
											<span>{nextStop.transport.transfers} transfer{nextStop.transport.transfers > 1 ? 's' : ''}</span>
										{/if}
										{#if nextStop.transport.walkingTimeMinutes && nextStop.transport.walkingTimeMinutes > 0}
											<span>•</span>
											<span>{nextStop.transport.walkingTimeMinutes}min walking</span>
										{/if}
									</div>
									{#if nextStop.transport.notes}
										<div class="text-base-content/60 mt-1 text-xs italic">
											{nextStop.transport.notes}
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<div class="text-base-content/50 flex items-center justify-center py-2">
								<span class="text-sm">Click to add transportation</span>
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
