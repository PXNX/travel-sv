<!-- src/routes/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import type { Category, TravelTip, Trip, TripStop, TransportSegment } from '$lib/types';
	import MapView from '$lib/components/MapView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import L from 'leaflet';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import TransportEditor from '$lib/components/TransportEditor.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// State
	let locations = $state<TravelTip[]>(data.initialLocations);
	let searchQuery = $state('');
	let selectedCategory = $state<Category | 'all'>('all');
	let showTripPlanner = $state(false);
	let selectedLocation = $state<TravelTip | null>(null);
	let showLocationSheet = $state(false);
	let mapCenter = $state<[number, number]>([50, 8]);
	let mapZoom = $state(6);
	let mapInstance = $state<L.Map>();

	// Transport editor state
	let showTransportEditor = $state(false);
	let editingStopIndex = $state(0);
	let transportFromLocation = $state('');
	let transportToLocation = $state('');
	let transportFromCoords = $state<[number, number] | undefined>(undefined);
	let transportToCoords = $state<[number, number] | undefined>(undefined);

	// Duration editor state
	let showDurationEditor = $state(false);
	let editingTipId = $state(0);
	let editingDuration = $state(60);

	// Trips state
	let trips = $state<Trip[]>([]);
	let currentTrip = $state<Trip | null>(null);
	let userLikes = $state<Set<number>>(new Set());

	// Load trips and likes from localStorage - only run on client
	$effect(() => {
		if (typeof window !== 'undefined') {
			const savedTrips = localStorage.getItem('trips');
			if (savedTrips) {
				trips = JSON.parse(savedTrips);
			}

			const savedLikes = localStorage.getItem('userLikes');
			if (savedLikes) {
				userLikes = new Set(JSON.parse(savedLikes));
			}

			locations = data.initialLocations.map((loc) => ({
				...loc,
				likes: parseInt(localStorage.getItem(`likes_${loc.id}`) || '0')
			}));
		}
	});

	function saveTrips() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('trips', JSON.stringify(trips));
		}
	}

	const locationsMap = $derived(new Map(locations.map((loc) => [loc.id, loc])));

	const filteredLocations = $derived(() => {
		let filtered = locations;

		if (selectedCategory !== 'all') {
			filtered = filtered.filter((loc) => loc.category === selectedCategory);
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(loc) =>
					loc.title.toLowerCase().includes(query) ||
					loc.description.toLowerCase().includes(query) ||
					loc.address?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	const currentTripStops = $derived(
		currentTrip
			? currentTrip.stops.map((stop) => ({
					...stop,
					location: locationsMap.get(stop.tipId)
				}))
			: []
	);

	const routeCoordinates = $derived(
		currentTripStops
			.map((stop) => stop.location)
			.filter((loc): loc is TravelTip => loc !== undefined)
			.map((loc) => [loc.latitude, loc.longitude] as [number, number])
	);

	function searchLocation() {
		if (searchQuery && filteredLocations().length > 0) {
			const firstLocation = filteredLocations()[0];
			mapCenter = [firstLocation.latitude, firstLocation.longitude];
			mapZoom = 13;
		}
	}

	function handleLocationClick(location: TravelTip) {
		selectedLocation = location;
		showLocationSheet = true;
		mapCenter = [location.latitude, location.longitude];
		mapZoom = 15;
	}

	function toggleLike(locationId: number) {
		const newLikes = new SvelteSet(userLikes);
		if (newLikes.has(locationId)) {
			newLikes.delete(locationId);
		} else {
			newLikes.add(locationId);
		}
		userLikes = newLikes;

		if (typeof window !== 'undefined') {
			localStorage.setItem('userLikes', JSON.stringify([...newLikes]));
		}

		locations = locations.map((loc) => {
			if (loc.id === locationId) {
				const delta = newLikes.has(locationId) ? 1 : -1;
				const newCount = Math.max(0, loc.likes + delta);
				if (typeof window !== 'undefined') {
					localStorage.setItem(`likes_${locationId}`, newCount.toString());
				}
				return { ...loc, likes: newCount };
			}
			return loc;
		});
	}

	function createTrip(name: string, description: string, startTime?: string) {
		const newTrip: Trip = {
			id: crypto.randomUUID(),
			name,
			description,
			stops: [],
			startDate: startTime,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		trips = [...trips, newTrip];
		currentTrip = newTrip;
		saveTrips();
	}

	function selectTrip(trip: Trip) {
		currentTrip = trip;
	}

	function deleteTrip(tripId: string) {
		trips = trips.filter((t) => t.id !== tripId);
		if (currentTrip?.id === tripId) {
			currentTrip = null;
		}
		saveTrips();
	}

	function clearTrip() {
		currentTrip = null;
	}

	function addToTrip(location: TravelTip) {
		if (!currentTrip) return;

		const newStop: TripStop = {
			tipId: location.id,
			order: currentTrip.stops.length,
			notes: ''
		};

		currentTrip = {
			...currentTrip,
			stops: [...currentTrip.stops, newStop],
			updatedAt: new Date().toISOString()
		};

		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
	}

	function removeFromTrip(tipId: number) {
		if (!currentTrip) return;

		currentTrip = {
			...currentTrip,
			stops: currentTrip.stops
				.filter((s) => s.tipId !== tipId)
				.map((s, index) => ({ ...s, order: index })),
			updatedAt: new Date().toISOString()
		};

		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
	}

	function isInCurrentTrip(tipId: number): boolean {
		return currentTrip?.stops.some((s) => s.tipId === tipId) ?? false;
	}

	function openDurationEditor(tipId: number, currentDuration: number) {
		editingTipId = tipId;
		editingDuration = currentDuration;
		showDurationEditor = true;
	}

	function saveDuration() {
		if (!currentTrip) return;

		currentTrip = {
			...currentTrip,
			stops: currentTrip.stops.map((stop) =>
				stop.tipId === editingTipId ? { ...stop, customDuration: editingDuration } : stop
			),
			updatedAt: new Date().toISOString()
		};

		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
		showDurationEditor = false;
	}

	function openTransportEditor(stopIndex: number, fromLocation: string, toLocation: string) {
		editingStopIndex = stopIndex;
		transportFromLocation = fromLocation;
		transportToLocation = toLocation;

		// Get coordinates for the locations
		if (currentTrip && stopIndex > 0) {
			const fromStop = currentTrip.stops[stopIndex - 1];
			const toStop = currentTrip.stops[stopIndex];

			const fromLoc = locationsMap.get(fromStop.tipId);
			const toLoc = locationsMap.get(toStop.tipId);

			if (fromLoc && toLoc) {
				transportFromCoords = [fromLoc.latitude, fromLoc.longitude];
				transportToCoords = [toLoc.latitude, toLoc.longitude];
			}
		}

		showTransportEditor = true;
	}

	function updateStopTransport(stopIndex: number, transport: TransportSegment) {
		if (!currentTrip) return;

		currentTrip = {
			...currentTrip,
			stops: currentTrip.stops.map((stop, index) =>
				index === stopIndex ? { ...stop, transport } : stop
			),
			updatedAt: new Date().toISOString()
		};

		trips = trips.map((t) => (t.id === currentTrip!.id ? currentTrip! : t));
		saveTrips();
	}

	function saveTransport(transport: TransportSegment) {
		updateStopTransport(editingStopIndex, transport);
		showTransportEditor = false;
	}

	function handleMarkerClick(location: TravelTip) {
		if (currentTrip && !isInCurrentTrip(location.id)) {
			addToTrip(location);
		} else {
			handleLocationClick(location);
		}
	}

	function handleCreateNewTrip() {
		showLocationSheet = false;
		showTripPlanner = true;
		setTimeout(() => {
			const newTripBtn = document.querySelector(
				'[onclick*="showNewTripDialog"]'
			) as HTMLButtonElement;
			newTripBtn?.click();
		}, 100);
	}
</script>

<svelte:head>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
	/>
</svelte:head>

<div class="flex h-screen overflow-hidden">
	<Sidebar
		bind:searchQuery
		bind:selectedCategory
		bind:showTripPlanner
		filteredLocations={filteredLocations()}
		{trips}
		{currentTrip}
		{currentTripStops}
		{locationsMap}
		{userLikes}
		{searchLocation}
		{handleLocationClick}
		{createTrip}
		{selectTrip}
		{deleteTrip}
		{removeFromTrip}
		updateStopDuration={openDurationEditor}
		{updateStopTransport}
		oncleartrip={clearTrip}
		oneditduration={openDurationEditor}
		onedittransport={openTransportEditor}
	/>

	<MapView
		{mapCenter}
		{mapZoom}
		filteredLocations={filteredLocations()}
		{currentTrip}
		{routeCoordinates}
		bind:mapInstance
		onmarkerclick={handleMarkerClick}
		onlocationselect={handleLocationClick}
		allLocations={locations}
	/>

	<LocationSheet
		bind:show={showLocationSheet}
		location={selectedLocation}
		{userLikes}
		{currentTrip}
		{isInCurrentTrip}
		{toggleLike}
		{addToTrip}
		oncreatenewtip={handleCreateNewTrip}
	/>

	<TransportEditor
		bind:show={showTransportEditor}
		transport={currentTrip?.stops[editingStopIndex]?.transport || null}
		fromLocation={transportFromLocation}
		toLocation={transportToLocation}
		fromCoords={transportFromCoords}
		toCoords={transportToCoords}
		onsave={saveTransport}
		oncancel={() => (showTransportEditor = false)}
	/>

	<!-- Duration Editor Dialog -->
	{#if showDurationEditor}
		<div
			class="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-3 sm:p-4"
			onclick={() => (showDurationEditor = false)}
		>
			<div
				class="bg-base-100 w-full max-w-sm rounded-lg p-4 shadow-xl sm:p-6"
				onclick={(e) => e.stopPropagation()}
			>
				<h3 class="mb-3 text-base font-bold sm:mb-4 sm:text-lg">Edit Stay Duration</h3>
				<div class="form-control mb-3 sm:mb-4">
					<label class="label"
						><span class="label-text text-xs sm:text-sm">Duration (minutes)</span></label
					>
					<input
						type="number"
						class="input input-bordered text-sm"
						bind:value={editingDuration}
						min="1"
						step="15"
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60 text-xs">
							{Math.floor(editingDuration / 60)}h {editingDuration % 60}min
						</span>
					</label>
				</div>
				<div class="flex gap-2 sm:gap-3">
					<button
						class="btn btn-ghost btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
						onclick={() => (showDurationEditor = false)}
					>
						Cancel
					</button>
					<button
						class="btn btn-primary btn-sm sm:btn-md flex-1 text-xs sm:text-sm"
						onclick={saveDuration}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
