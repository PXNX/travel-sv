<!-- src/lib/components/Sidebar.svelte -->
<script lang="ts">
	import type { Category, TravelTip, Trip, TripStop } from '$lib/types';
	import { categoryInfo } from '$lib/types';
	import { formatDuration, getTotalTripDuration } from '$lib/utils/calculations';
	import TripTimeline from './TripTimeline.svelte';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconPin from '~icons/fluent/pin-24-filled';
	import IconFilter from '~icons/fluent/filter-24-regular';
	import IconLocationIcon from '~icons/fluent/location-24-regular';
	import IconNavigation from '~icons/fluent/navigation-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
	import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconMenu from '~icons/fluent/navigation-24-regular';
	import IconDistance from '~icons/fluent/arrow-routing-24-regular';
	import IconFoodApple from '~icons/fluent-emoji/fork-and-knife-with-plate';

	import Modal from './Modal.svelte';
	import { haversineDistance } from '$lib/utils/routing';

	interface Props {
		searchQuery: string;
		selectedCategory: Category | 'all';
		showTripPlanner: boolean;
		filteredLocations: TravelTip[];
		trips: Trip[];
		currentTrip: Trip | null;
		currentTripStops: (TripStop & { location?: TravelTip })[];
		locationsMap: Map<number, TravelTip>;
		userLikes: Set<number>;
		searchLocation: () => void;
		handleLocationClick: (location: TravelTip) => void;
		createTrip: (name: string, description: string, startTime?: string) => void;
		selectTrip: (trip: Trip) => void;
		deleteTrip: (tripId: string) => void;
		removeFromTrip: (tipId: number) => void;
		updateStopDuration: (tipId: number, duration: number) => void;
		updateStopTransport: (stopIndex: number, transport: any) => void;
		oncleartrip: () => void;
		oneditduration: (tipId: number, currentDuration: number) => void;
		onedittransport: (stopIndex: number, fromLocation: string, toLocation: string) => void;
	}

	let {
		searchQuery = $bindable(),
		selectedCategory = $bindable(),
		showTripPlanner = $bindable(),
		filteredLocations,
		trips,
		currentTrip,
		currentTripStops,
		locationsMap,
		userLikes,
		searchLocation,
		handleLocationClick,
		createTrip,
		selectTrip,
		deleteTrip,
		removeFromTrip,
		oncleartrip,
		oneditduration,
		onedittransport
	}: Props = $props();

	let showNewTripDialog = $state(false);
	let newTripName = $state('');
	let newTripDescription = $state('');
	let newTripStartTime = $state('09:00');
	let isOpen = $state(true);
	let showDeleteTripDialog = $state(false);
	let tripToDelete: string | null = $state(null);

	function handleCreateTrip() {
		if (!newTripName.trim()) return;
		createTrip(newTripName, newTripDescription, newTripStartTime);
		newTripName = '';
		newTripDescription = '';
		newTripStartTime = '09:00';
		showNewTripDialog = false;
	}

	function confirmDeleteTrip(tripId: string) {
		tripToDelete = tripId;
		showDeleteTripDialog = true;
	}

	function handleDeleteTrip() {
		if (tripToDelete) {
			deleteTrip(tripToDelete);
			tripToDelete = null;
		}
		showDeleteTripDialog = false;
	}

	const totalTripDuration = $derived(
		currentTrip ? getTotalTripDuration(currentTrip.stops, locationsMap) : 0
	);

	const totalTravelTime = $derived(() => {
		if (!currentTrip) return 0;
		const stayTime = getTotalTripDuration(currentTrip.stops, locationsMap);
		const transportTime = currentTrip.stops.reduce((acc, stop) => {
			return acc + (stop.transport?.durationMinutes || 0);
		}, 0);
		return stayTime + transportTime;
	});

	const totalDistance = $derived(() => {
		if (!currentTrip || currentTrip.stops.length < 2) return 0;
		let distance = 0;

		for (let i = 0; i < currentTrip.stops.length - 1; i++) {
			const currentLoc = locationsMap.get(currentTrip.stops[i].tipId);
			const nextLoc = locationsMap.get(currentTrip.stops[i + 1].tipId);

			if (currentLoc && nextLoc) {
				distance += haversineDistance(
					[currentLoc.latitude, currentLoc.longitude],
					[nextLoc.latitude, nextLoc.longitude]
				);
			}
		}

		return distance;
	});
</script>

<!-- Mobile Toggle Button -->
<button
	class="btn btn-primary btn-circle fixed bottom-4 left-4 z-[1500] shadow-lg lg:hidden"
	onclick={() => (isOpen = !isOpen)}
>
	<IconMenu class="size-6" />
</button>

<!-- Sidebar/Drawer -->
<div
	class="bg-base-100 border-base-300 fixed inset-y-0 left-0 z-[1400] flex w-full flex-col overflow-hidden border-r shadow-2xl transition-transform duration-300 sm:w-96 lg:relative lg:translate-x-0"
	class:translate-x-0={isOpen}
	class:-translate-x-full={!isOpen}
>
	<!-- Header -->
	<div class="bg-base-200 border-base-300 border-b p-3 sm:p-4">
		<div class="mb-3 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<IconMap class="text-primary h-5 w-5 sm:h-6 sm:w-6" />
				<h1 class="text-base-content text-lg font-bold sm:text-xl">Travel Planner</h1>
			</div>
			<button class="btn btn-ghost btn-sm btn-circle lg:hidden" onclick={() => (isOpen = false)}>
				<IconDismiss class="size-5" />
			</button>
		</div>

		<div class="join mb-3 w-full">
			<input
				type="text"
				placeholder="Search location..."
				class="input input-sm input-bordered join-item flex-grow text-sm"
				bind:value={searchQuery}
				onkeydown={(e) => e.key === 'Enter' && searchLocation()}
			/>
			<button class="btn btn-sm btn-square join-item btn-primary" onclick={searchLocation}>
				<IconSearch class="size-4 sm:size-5" />
			</button>
		</div>

		<div class="text-base-content/70 flex items-center gap-2 text-xs">
			<IconPin class="text-secondary size-3 flex-shrink-0 sm:size-4" />
			<span class="text-xs sm:text-sm">Click map to add a new location tip.</span>
		</div>
	</div>

	<!-- Main Controls -->
	<div class="bg-base-100 border-base-300 space-y-3 border-b p-3 sm:p-4">
		<div class="join w-full">
			<button
				class="join-item btn btn-sm flex-1 text-xs sm:text-sm"
				class:btn-primary={!showTripPlanner}
				class:btn-outline={showTripPlanner}
				onclick={() => (showTripPlanner = false)}
			>
				<IconLocationIcon class="size-3 sm:size-4" />
				<span class="hidden sm:inline">Browse</span>
			</button>
			<button
				class="join-item btn btn-sm flex-1 text-xs sm:text-sm"
				class:btn-primary={showTripPlanner}
				class:btn-outline={!showTripPlanner}
				onclick={() => (showTripPlanner = true)}
			>
				<IconNavigation class="size-3 sm:size-4" />
				Trips ({trips.length})
			</button>
		</div>

		{#if !showTripPlanner}
			<div class="flex items-center gap-2">
				<IconFilter class="text-primary size-3 flex-shrink-0 sm:size-4" />
				<span class="text-xs font-semibold sm:text-sm">Filter:</span>
				<select
					class="select select-sm select-bordered flex-1 text-xs sm:text-sm"
					bind:value={selectedCategory}
				>
					<option value="all">All</option>
					{#each Object.values(categoryInfo) as cat}
						<option value={cat.value}>{cat.label}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto">
		{#if showTripPlanner}
			<div class="p-3 sm:p-4">
				{#if !currentTrip}
					<div class="space-y-3">
						<button
							class="btn btn-primary btn-sm w-full gap-2 text-xs sm:text-sm"
							onclick={() => (showNewTripDialog = true)}
						>
							<IconAdd class="size-4 sm:size-5" />
							Plan New Trip
						</button>

						{#if trips.length === 0}
							<div class="text-base-content/50 py-8 text-center">
								<IconNavigation class="mx-auto mb-2 size-10 sm:size-12" />
								<p class="text-xs sm:text-sm">No trips planned yet.</p>
								<p class="text-xs">Start by creating a new trip.</p>
							</div>
						{:else}
							<div class="space-y-2 sm:space-y-3">
								<h3 class="text-base-content/70 text-xs font-semibold sm:text-sm">Saved Trips:</h3>
								{#each trips as trip (trip.id)}
									<div
										class="card card-compact bg-base-200 border-base-300 cursor-pointer border shadow transition-shadow hover:shadow-lg"
										onclick={() => selectTrip(trip)}
									>
										<div class="card-body p-3 sm:p-4">
											<div class="flex items-start justify-between">
												<div class="min-w-0 flex-1">
													<h3 class="truncate text-sm font-bold sm:text-base">{trip.name}</h3>
													{#if trip.description}
														<p class="text-base-content/70 line-clamp-1 text-xs sm:text-sm">
															{trip.description}
														</p>
													{/if}
													<div
														class="text-base-content/70 mt-2 flex flex-wrap items-center gap-2 text-xs"
													>
														<div class="flex items-center gap-1">
															<IconLocationIcon class="size-3" />
															<span>{trip.stops.length} stops</span>
														</div>
														<div class="flex items-center gap-1">
															<IconClock class="size-3" />
															<span class="font-medium"
																>{formatDuration(
																	getTotalTripDuration(trip.stops, locationsMap)
																)}</span
															>
														</div>
														{#if trip.startDate}
															<div class="flex items-center gap-1">
																<IconCalendar class="size-3" />
																<span>{trip.startDate}</span>
															</div>
														{/if}
													</div>
												</div>
												<div class="ml-2 flex gap-1">
													<button
														class="btn btn-ghost btn-xs text-error tooltip tooltip-left z-10"
														data-tip="Delete"
														onclick={(e) => {
															e.stopPropagation();
															confirmDeleteTrip(trip.id);
														}}
													>
														<IconDelete class="size-3 sm:size-4" />
													</button>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="space-y-3 sm:space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="truncate text-lg font-bold sm:text-xl">{currentTrip.name}</h2>
							<button
								class="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom"
								data-tip="Close"
								onclick={oncleartrip}
							>
								<IconDismiss class="size-4 sm:size-5" />
							</button>
						</div>

						<div class="stats bg-base-200 border-base-300 w-full border shadow-md">
							<div class="stat p-2 sm:p-3">
								<div class="stat-title text-base-content/70 text-[10px] sm:text-xs">Stops</div>
								<div class="stat-value text-lg sm:text-xl">{currentTrip.stops.length}</div>
							</div>
							<div class="stat p-2 sm:p-3">
								<div class="stat-title text-base-content/70 text-[10px] sm:text-xs">Duration</div>
								<div class="stat-value text-lg sm:text-xl">{formatDuration(totalTravelTime())}</div>
								<div class="stat-desc text-base-content/60 mt-1 text-[10px] sm:text-xs">
									<IconClock class="mr-1 inline size-2 align-bottom sm:size-3" />
									{formatDuration(totalTripDuration)} at locations
								</div>
							</div>
							{#if totalDistance() > 0}
								<div class="stat p-2 sm:p-3">
									<div class="stat-title text-base-content/70 text-[10px] sm:text-xs">Distance</div>
									<div class="stat-value text-lg sm:text-xl">{totalDistance().toFixed(1)} km</div>
									<div class="stat-desc text-base-content/60 mt-1 text-[10px] sm:text-xs">
										<IconDistance class="mr-1 inline size-2 align-bottom sm:size-3" />
										Total travel
									</div>
								</div>
							{/if}
						</div>

						{#if currentTripStops.length === 0}
							<div role="alert" class="alert alert-info p-3">
								<IconLocationIcon class="size-4 flex-shrink-0 sm:size-5" />
								<span class="text-xs sm:text-sm">Browse the map to add locations to your trip.</span
								>
							</div>
						{:else}
							<TripTimeline
								stops={currentTripStops}
								startTime={currentTrip.startDate || '09:00'}
								{oneditduration}
								{onedittransport}
								onremove={removeFromTrip}
							/>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<div class="space-y-2 p-3 sm:space-y-3 sm:p-4">
				{#if filteredLocations.length === 0}
					<div class="text-base-content/50 py-8 text-center">
						<IconMap class="mx-auto mb-2 size-10 sm:size-12" />
						<p class="text-xs sm:text-sm">No locations found matching the filter.</p>
					</div>
				{:else}
					{#each filteredLocations as location (location.id)}
						{@const categoryStyle = categoryInfo[location.category]}
						<div
							class="card card-compact bg-base-200 border-base-300 cursor-pointer border shadow-md transition-all hover:scale-[1.02] hover:shadow-xl"
							onclick={() => handleLocationClick(location)}
						>
							<div class="card-body p-3 sm:p-4">
								<div class="flex items-start gap-3">
									<div
										class="flex size-12 flex-shrink-0 items-center justify-center rounded-lg"
										style="background-color: {categoryStyle.color}; "
									>
										<categoryStyle.icon class="size-6" />
									</div>

									<div class="min-w-0 flex-1">
										<h3 class="card-title line-clamp-1 text-sm sm:text-base">{location.title}</h3>

										<p class="text-base-content/70 mt-2 line-clamp-2 text-xs sm:text-sm">
											{location.description}
										</p>
										{#if location.address}
											<p class="text-base-content/60 mt-1 line-clamp-1 text-[10px] sm:text-xs">
												📍 {location.address}
											</p>
										{/if}
									</div>
								</div>

								<div class="border-base-300 mt-3 flex items-center justify-between border-t pt-2">
									<div class="flex items-center gap-2 text-xs sm:text-sm">
										<IconClock class="text-primary size-3 flex-shrink-0 sm:size-4" />
										<span class="font-medium">{formatDuration(location.durationMinutes)}</span>
									</div>
									<div class="text-base-content/70 flex items-center gap-1 text-xs sm:text-sm">
										{#if userLikes.has(location.id)}
											<IconThumbLikeFilled class="text-error size-3 flex-shrink-0 sm:size-4" />
										{:else}
											<IconThumbLike class="size-3 flex-shrink-0 sm:size-4" />
										{/if}
										<span class="font-medium">{location.likes}</span>
									</div>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Overlay for mobile -->
{#if isOpen}
	<div class="fixed inset-0 z-[1300] bg-black/50 lg:hidden" onclick={() => (isOpen = false)}></div>
{/if}

<Modal bind:open={showNewTripDialog} title="Create New Trip">
	<div class="space-y-3 sm:space-y-4">
		<div class="form-control">
			<label class="label">
				<span class="label-text text-xs font-semibold sm:text-sm">Trip Name *</span>
			</label>
			<input
				type="text"
				class="input input-bordered input-primary text-sm"
				bind:value={newTripName}
				placeholder="e.g., Weekend in Rome"
			/>
		</div>

		<div class="form-control">
			<label class="label">
				<span class="label-text text-xs font-semibold sm:text-sm">Description</span>
			</label>
			<textarea
				class="textarea textarea-bordered h-16 text-sm sm:h-20"
				bind:value={newTripDescription}
				placeholder="Optional: A brief outline of your plan..."
			></textarea>
		</div>

		<div class="form-control">
			<label class="label">
				<span class="label-text text-xs font-semibold sm:text-sm">Start Time</span>
			</label>
			<div class="flex items-center gap-2">
				<IconClock class="text-secondary size-4 flex-shrink-0 sm:size-5" />
				<input
					type="time"
					class="input input-bordered flex-1 text-sm"
					bind:value={newTripStartTime}
				/>
			</div>
		</div>

		<div class="modal-action mt-4 flex gap-2 sm:mt-6 sm:gap-3">
			<button
				class="btn btn-ghost btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={() => (showNewTripDialog = false)}
			>
				Cancel
			</button>
			<button
				class="btn btn-primary btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={handleCreateTrip}
				disabled={!newTripName.trim()}
			>
				<IconSave class="size-4 sm:size-5" />
				Create Trip
			</button>
		</div>
	</div>
</Modal>

<Modal bind:open={showDeleteTripDialog} title="Delete Trip?">
	<div class="space-y-4">
		<p class="text-base-content/80 text-sm">
			Are you sure you want to delete this trip? This action cannot be undone.
		</p>

		<div class="modal-action mt-6 flex gap-2 sm:gap-3">
			<button
				class="btn btn-ghost btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={() => {
					showDeleteTripDialog = false;
					tripToDelete = null;
				}}
			>
				Cancel
			</button>
			<button
				class="btn btn-error btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
				onclick={handleDeleteTrip}
			>
				<IconDelete class="size-4 sm:size-5" />
				Delete
			</button>
		</div>
	</div>
</Modal>
