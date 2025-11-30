<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Map, TileLayer, Marker, Popup, Polyline } from 'sveaflet';
	import { onMount } from 'svelte';
	import L from 'leaflet';
	import {
		categoryInfo,
		type Trip,
		type TripStop,
		type Category,
		type TravelTip
	} from '$lib/types';
	import { goto } from '$app/navigation';
	import { formatDuration, getTotalTripDuration } from '$lib/utils/calculations';

	// Import Fluent icons
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconNavigation from '~icons/fluent/navigation-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
	import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconFilter from '~icons/fluent/filter-24-regular';
	import FluentList24Regular from '~icons/fluent/list-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconLocationIcon from '~icons/fluent/location-24-regular';
	import IconPin from '~icons/fluent/pin-24-filled';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';

	interface Props {
		data: {
			initialLocations?: TravelTip[];
			isSignedIn?: boolean;
			user?: { id: string; name: string; email: string; isAdmin: boolean };
		};
	}

	let { data }: Props = $props();

	// State
	let locations = $state<TravelTip[]>(data.initialLocations || []);
	let selectedCategory = $state<Category | 'all'>('all');
	let searchQuery = $state('');
	let mapInstance: L.Map | undefined = $state();
	let mapCenter = $state<[number, number]>([51.505, -0.09]);
	let mapZoom = $state(13);

	// Bottom sheet state
	let showBottomSheet = $state(false);
	let selectedLocation = $state<TravelTip | null>(null);
	let userLikes = $state<Set<number>>(new Set());

	// Trip planning
	let trips = $state<Trip[]>([]);
	let currentTrip = $state<Trip | null>(null);
	let showTripPlanner = $state(false);
	let showNewTripDialog = $state(false);
	let newTripName = $state('');
	let newTripDescription = $state('');

	// Filtered locations
	const filteredLocations = $derived(
		locations.filter((location) => {
			const matchesSearch =
				location.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				location.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesCategory = selectedCategory === 'all' || location.category === selectedCategory;
			return matchesSearch && matchesCategory;
		})
	);

	// Get locations map for quick lookup
	const locationsMap = $derived(locations.map((loc) => [loc.id, loc]));

	// Current trip stops with details
	const currentTripStops = $derived(
		currentTrip
			? currentTrip.stops
					.map((stop) => ({
						...stop,
						location: locationsMap.get(stop.tipId)
					}))
					.filter((stop) => stop.location)
			: []
	);

	// Total trip duration
	const totalTripDuration = $derived(
		currentTrip ? getTotalTripDuration(currentTrip.stops, locationsMap) : 0
	);

	// Route coordinates for polyline
	const routeCoordinates = $derived(
		currentTripStops.map(
			(stop) => [stop.location!.latitude, stop.location!.longitude] as [number, number]
		)
	);

	// Load data from localStorage
	onMount(() => {
		const savedTrips = localStorage.getItem('travel-trips');
		if (savedTrips) {
			trips = JSON.parse(savedTrips);
		}

		const savedLikes = localStorage.getItem('travel-likes');
		if (savedLikes) {
			userLikes = new SvelteSet(JSON.parse(savedLikes));
		}
	});

	// Attach map click handler using $effect
	$effect(() => {
		if (mapInstance) {
			mapInstance.on('click', handleMapClick);
			return () => {
				mapInstance.off('click', handleMapClick);
			};
		}
	});

	// Save trips to localStorage
	function saveTrips() {
		localStorage.setItem('travel-trips', JSON.stringify(trips));
	}

	// Save likes to localStorage
	function saveLikes() {
		localStorage.setItem('travel-likes', JSON.stringify(Array.from(userLikes)));
	}

	// Toggle like
	function toggleLike(locationId: number) {
		if (userLikes.has(locationId)) {
			userLikes.delete(locationId);
			// Update location likes count
			const location = locations.find((l) => l.id === locationId);
			if (location) location.likes--;
		} else {
			userLikes.add(locationId);
			// Update location likes count
			const location = locations.find((l) => l.id === locationId);
			if (location) location.likes++;
		}
		userLikes = new SvelteSet(userLikes); // Trigger reactivity
		saveLikes();
	}

	// Custom marker icon by category
	function getCategoryIcon(category: Category) {
		const info = categoryInfo[category];
		return L.divIcon({
			html: `<div style="background-color: ${info.color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">${info.icon}</div>`,
			className: 'custom-marker',
			iconSize: [32, 32],
			iconAnchor: [16, 16]
		});
	}

	function handleMapClick(e: L.LeafletMouseEvent) {
		const clickedLat = e.latlng.lat;
		const clickedLng = e.latlng.lng;

		// Check if user clicked on/near an existing location (within ~50m)
		const nearbyLocation = locations.find((loc) => {
			const distance = mapInstance?.distance(
				[clickedLat, clickedLng],
				[loc.latitude, loc.longitude]
			);
			return distance && distance < 50;
		});

		if (nearbyLocation) {
			// Show location in bottom sheet
			selectedLocation = nearbyLocation;
			showBottomSheet = true;
		} else if (data.isSignedIn) {
			// Navigate to new location page with coordinates
			goto(resolve(`/location/new?lat=${clickedLat.toFixed(6)}&lng=${clickedLng.toFixed(6)}`));
		}
	}

	function handleLocationCardClick(location: TravelTip) {
		selectedLocation = location;
		showBottomSheet = true;
		mapCenter = [location.latitude, location.longitude];
		mapZoom = 16;
	}

	function closeBottomSheet() {
		showBottomSheet = false;
		selectedLocation = null;
	}

	function searchLocation() {
		if (!searchQuery.trim()) return;

		fetch(
			`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
		)
			.then((res) => res.json())
			.then((results) => {
				if (results.length > 0) {
					mapCenter = [parseFloat(results[0].lat), parseFloat(results[0].lon)];
					mapZoom = 13;
				}
			})
			.catch((err) => console.error('Search error:', err));
	}

	function createTrip() {
		if (!newTripName.trim()) return;

		const trip: Trip = {
			id: `trip_${Date.now()}`,
			name: newTripName,
			description: newTripDescription,
			stops: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		trips = [...trips, trip];
		currentTrip = trip;
		saveTrips();

		newTripName = '';
		newTripDescription = '';
		showNewTripDialog = false;
		showTripPlanner = true;
	}

	function addToTrip(location: TravelTip) {
		if (!currentTrip) {
			showNewTripDialog = true;
			return;
		}

		// Check if already in trip
		if (currentTrip.stops.some((s) => s.tipId === location.id)) {
			return;
		}

		const stop: TripStop = {
			tipId: location.id,
			order: currentTrip.stops.length,
			customDuration: undefined,
			notes: ''
		};

		currentTrip.stops = [...currentTrip.stops, stop];
		currentTrip.updatedAt = new Date().toISOString();
		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
	}

	function removeFromTrip(tipId: number) {
		if (!currentTrip) return;

		currentTrip.stops = currentTrip.stops
			.filter((stop) => stop.tipId !== tipId)
			.map((stop, index) => ({ ...stop, order: index }));

		currentTrip.updatedAt = new Date().toISOString();
		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
	}

	function deleteTrip(tripId: string) {
		trips = trips.filter((t) => t.id !== tripId);
		if (currentTrip?.id === tripId) {
			currentTrip = null;
		}
		saveTrips();
	}

	function selectTrip(trip: Trip) {
		currentTrip = trip;
		showTripPlanner = true;

		// Fit map to show all stops
		if (trip.stops.length > 0) {
			const bounds = L.latLngBounds(
				trip.stops
					.map((stop) => locationsMap.get(stop.tipId))
					.filter(Boolean)
					.map((loc) => [loc!.latitude, loc!.longitude] as [number, number])
			);
			mapInstance?.fitBounds(bounds, { padding: [50, 50] });
		}
	}

	function viewLocationDetail(locationId: number) {
		goto(resolve(`/location/${locationId}`));
	}

	function isInCurrentTrip(tipId: number): boolean {
		return currentTrip?.stops.some((s) => s.tipId === tipId) ?? false;
	}
</script>

<div class="flex h-screen w-full">
	<!-- Sidebar -->
	<div class="bg-base-200 border-base-300 flex w-96 flex-col overflow-hidden border-r">
		<!-- Header -->
		<div class="bg-primary text-primary-content p-4">
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<IconMap class="h-6 w-6" />
					<h1 class="text-xl font-bold">Travel Locations</h1>
				</div>
			</div>

			<!-- Search -->
			<div class="flex gap-2">
				<input
					type="text"
					placeholder="Search location..."
					class="input input-sm text-base-content flex-1"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && searchLocation()}
				/>
				<button class="btn btn-sm btn-square" onclick={searchLocation}>
					<IconSearch class="size-5" />
				</button>
			</div>

			{#if data.isSignedIn}
				<div class="alert alert-sm bg-primary-focus text-primary-content mt-3 border-0">
					<IconPin class="size-4" />
					<span class="text-xs">Click anywhere on map to add new location</span>
				</div>
			{/if}
		</div>

		<!-- Category Filter & Trip Toggle -->
		<div class="bg-base-100 border-base-300 space-y-3 border-b p-4">
			<div>
				<div class="mb-2 flex items-center gap-2">
					<IconFilter class="size-4" />
					<span class="text-sm font-medium">Category</span>
				</div>
				<select class="select select-sm select-bordered w-full" bind:value={selectedCategory}>
					<option value="all">All Categories</option>
					{#each Object.values(categoryInfo) as cat}
						<option value={cat.value}>{cat.icon} {cat.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<button
					class="btn btn-sm flex-1"
					class:btn-primary={!showTripPlanner}
					onclick={() => (showTripPlanner = false)}
				>
					<IconLocationIcon class="size-4" />
					Browse
				</button>
				<button
					class="btn btn-sm flex-1"
					class:btn-primary={showTripPlanner}
					onclick={() => (showTripPlanner = true)}
				>
					<IconNavigation class="size-4" />
					Trips ({trips.length})
				</button>
			</div>
		</div>

		<!-- Content Area -->
		<div class="flex-1 overflow-y-auto">
			{#if showTripPlanner}
				<!-- Trip Planner -->
				<div class="p-4">
					{#if !currentTrip}
						<!-- Trip Selection -->
						<div class="space-y-3">
							<button
								class="btn btn-primary btn-sm w-full gap-2"
								onclick={() => (showNewTripDialog = true)}
							>
								<IconAdd class="size-5" />
								New Trip
							</button>

							{#if trips.length === 0}
								<div class="text-base-content/60 py-8 text-center">
									<IconNavigation class="mx-auto mb-2 size-12 opacity-50" />
									<p class="text-sm">No trips yet</p>
									<p class="text-xs">Create a trip to start planning</p>
								</div>
							{:else}
								{#each trips as trip (trip.id)}
									<div class="card bg-base-100 shadow">
										<div class="card-body p-4">
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<h3 class="font-bold">{trip.name}</h3>
													{#if trip.description}
														<p class="text-base-content/70 text-sm">{trip.description}</p>
													{/if}
													<div class="text-base-content/60 mt-2 flex items-center gap-3 text-xs">
														<span>{trip.stops.length} stops</span>
														<span
															>{formatDuration(
																getTotalTripDuration(trip.stops, locationsMap)
															)}</span
														>
													</div>
												</div>
												<div class="flex gap-1">
													<button
														class="btn btn-ghost btn-xs btn-square"
														onclick={() => selectTrip(trip)}
													>
														<IconEdit class="size-4" />
													</button>
													<button
														class="btn btn-ghost btn-xs btn-square text-error"
														onclick={() => deleteTrip(trip.id)}
													>
														<IconDelete class="size-4" />
													</button>
												</div>
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>
					{:else}
						<!-- Current Trip Editor -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h2 class="text-lg font-bold">{currentTrip.name}</h2>
								<button
									class="btn btn-ghost btn-sm btn-square"
									onclick={() => (currentTrip = null)}
								>
									<IconDismiss class="size-5" />
								</button>
							</div>

							<div class="stats stats-vertical bg-base-100 w-full shadow">
								<div class="stat p-3">
									<div class="stat-title text-xs">Stops</div>
									<div class="stat-value text-2xl">{currentTrip.stops.length}</div>
								</div>
								<div class="stat p-3">
									<div class="stat-title text-xs">Duration</div>
									<div class="stat-value text-2xl">{formatDuration(totalTripDuration)}</div>
								</div>
							</div>

							{#if currentTripStops.length === 0}
								<div class="alert">
									<FluentList24Regular class="size-5" />
									<span class="text-sm">Tap locations to add them to your trip</span>
								</div>
							{:else}
								<div class="space-y-2">
									{#each currentTripStops as stop, index (stop.tipId)}
										{@const location = stop.location!}
										<div class="card bg-base-100 shadow">
											<div class="card-body p-3">
												<div class="flex items-start gap-3">
													<div
														class="badge badge-lg"
														style="background-color: {categoryInfo[location.category]
															.color}; color: white;"
													>
														{index + 1}
													</div>
													<div class="flex-1">
														<h3 class="text-sm font-semibold">{location.title}</h3>
														<div class="text-base-content/70 mt-1 flex items-center gap-2 text-xs">
															<IconClock class="h-3 w-3" />
															<span
																>{formatDuration(
																	stop.customDuration || location.durationMinutes
																)}</span
															>
														</div>
													</div>
													<button
														class="btn btn-ghost btn-xs btn-square"
														onclick={() => removeFromTrip(location.id)}
													>
														<IconDismiss class="size-4" />
													</button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Locations List -->
				<div class="space-y-3 p-4">
					{#if filteredLocations.length === 0}
						<div class="text-base-content/60 py-8 text-center">
							<IconMap class="mx-auto mb-2 size-12 opacity-50" />
							<p>No locations found</p>
						</div>
					{:else}
						{#each filteredLocations as location (location.id)}
							<div
								class="card bg-base-100 cursor-pointer shadow transition-shadow hover:shadow-lg"
								onclick={() => handleLocationCardClick(location)}
							>
								<div class="card-body p-4">
									{#if location.imageUrl}
										<figure class="-m-4 mb-3">
											<img
												src={location.imageUrl}
												alt={location.title}
												class="h-32 w-full object-cover"
											/>
										</figure>
									{/if}

									<div class="flex items-start justify-between gap-2">
										<div class="flex-1">
											<div class="mb-1 flex items-center gap-2">
												<span class="text-lg">{categoryInfo[location.category].icon}</span>
												<h3 class="card-title text-base">{location.title}</h3>
											</div>
											<p class="text-base-content/70 line-clamp-2 text-sm">
												{location.description}
											</p>
											{#if location.address}
												<p class="text-base-content/60 mt-1 text-xs">{location.address}</p>
											{/if}
										</div>
									</div>

									<div class="mt-2 flex items-center gap-3">
										<div class="flex items-center gap-1">
											<IconClock class="size-4" />
											<span class="text-sm">{formatDuration(location.durationMinutes)}</span>
										</div>
										<div class="ml-auto flex items-center gap-1">
											{#if userLikes.has(location.id)}
												<IconThumbLikeFilled class="text-primary size-4" />
											{:else}
												<IconThumbLike class="size-4" />
											{/if}
											<span class="text-sm">{location.likes}</span>
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

	<!-- Map -->
	<div class="relative flex-1">
		<Map
			options={{ center: mapCenter, zoom: mapZoom, minZoom: 2, maxZoom: 18 }}
			class="h-full w-full"
			bind:instance={mapInstance}
		>
			<TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />

			<!-- Route polyline -->
			{#if currentTrip && routeCoordinates.length > 1}
				<Polyline
					latLngs={routeCoordinates}
					options={{
						color: '#3b82f6',
						weight: 4,
						opacity: 0.7,
						dashArray: '10, 10'
					}}
				/>
			{/if}

			<!-- Markers -->
			{#each filteredLocations as location (location.id)}
				<Marker
					latLng={[location.latitude, location.longitude]}
					icon={getCategoryIcon(location.category)}
					eventHandlers={{
						click: () => {
							selectedLocation = location;
							showBottomSheet = true;
						}
					}}
				/>
			{/each}
		</Map>
	</div>
</div>

<!-- Bottom Sheet -->
{#if showBottomSheet && selectedLocation}
	<div class="fixed inset-0 z-[2000] bg-black/50" onclick={closeBottomSheet}></div>
	<div
		class="bg-base-100 animate-slide-up fixed right-0 bottom-0 left-0 z-[2001] rounded-t-3xl shadow-2xl"
	>
		<div class="container mx-auto max-w-2xl">
			<!-- Drag Handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="bg-base-300 h-1 w-12 rounded-full"></div>
			</div>

			<div class="max-h-[70vh] overflow-y-auto p-6">
				<!-- Image -->
				{#if selectedLocation.imageUrl}
					<img
						src={selectedLocation.imageUrl}
						alt={selectedLocation.title}
						class="mb-4 h-48 w-full rounded-2xl object-cover"
					/>
				{/if}

				<!-- Title and Category -->
				<div class="mb-4 flex items-start gap-3">
					<span class="text-4xl">{categoryInfo[selectedLocation.category].icon}</span>
					<div class="flex-1">
						<h2 class="text-2xl font-bold">{selectedLocation.title}</h2>
						<div
							class="badge mt-1"
							style="background-color: {categoryInfo[selectedLocation.category]
								.color}; color: white;"
						>
							{categoryInfo[selectedLocation.category].label}
						</div>
					</div>
				</div>

				<!-- Stats -->
				<div class="mb-4 flex items-center gap-4">
					<div class="flex items-center gap-2">
						<IconClock class="size-5" />
						<span class="font-medium">{formatDuration(selectedLocation.durationMinutes)}</span>
					</div>
					<button class="flex items-center gap-2" onclick={() => toggleLike(selectedLocation.id)}>
						{#if userLikes.has(selectedLocation.id)}
							<IconThumbLikeFilled class="text-primary size-5" />
						{:else}
							<IconThumbLike class="size-5" />
						{/if}
						<span class="font-medium">{selectedLocation.likes}</span>
					</button>
				</div>

				<!-- Description -->
				<p class="text-base-content/80 mb-6">{selectedLocation.description}</p>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						class="btn btn-primary flex-1"
						onclick={() => viewLocationDetail(selectedLocation.id)}
					>
						View Details
					</button>
					{#if currentTrip}
						{#if isInCurrentTrip(selectedLocation.id)}
							<button class="btn btn-outline flex-1 gap-2" disabled>
								<FluentList24Regular class="size-5" />
								In Trip
							</button>
						{:else}
							<button
								class="btn btn-outline flex-1 gap-2"
								onclick={() => {
									addToTrip(selectedLocation);
									closeBottomSheet();
								}}
							>
								<FluentList24Regular class="size-5" />
								Add to Trip
							</button>
						{/if}
					{:else}
						<button
							class="btn btn-outline flex-1 gap-2"
							onclick={() => {
								showNewTripDialog = true;
								closeBottomSheet();
							}}
						>
							<FluentList24Regular class="size-5" />
							Add to Trip
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- New Trip Dialog -->
{#if showNewTripDialog}
	<div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
		<div class="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold">New Trip</h2>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={() => (showNewTripDialog = false)}>
					<IconDismiss class="size-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="form-control">
					<label class="label"><span class="label-text">Trip Name *</span></label>
					<input
						type="text"
						class="input input-bordered"
						bind:value={newTripName}
						placeholder="Weekend in Paris"
					/>
				</div>

				<div class="form-control">
					<label class="label"><span class="label-text">Description</span></label>
					<textarea
						class="textarea textarea-bordered"
						bind:value={newTripDescription}
						placeholder="Optional description..."
					></textarea>
				</div>

				<div class="flex gap-3">
					<button class="btn btn-ghost flex-1" onclick={() => (showNewTripDialog = false)}>
						Cancel
					</button>
					<button
						class="btn btn-primary flex-1"
						onclick={createTrip}
						disabled={!newTripName.trim()}
					>
						<IconSave class="size-4" />
						Create
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
