<!-- src/routes/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import type { Category, TravelTip, Trip, TripStop, TransportSegment } from '$lib/types';
	import MapView from '$lib/components/MapView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import L from 'leaflet';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import TransportEditor from '$lib/components/TransportEditor.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
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

	// Location search state
	let locationSearchResults = $state<any[]>([]);
	let isSearchingLocation = $state(false);
	let showLocationResults = $state(false);

	// Transport editor state
	let showTransportEditor = $state(false);
	let editingStopIndex = $state(0);
	let transportFromLocation = $state('');
	let transportToLocation = $state('');
	let transportFromCoords = $state<[number, number] | undefined>(undefined);
	let transportToCoords = $state<[number, number] | undefined>(undefined);
	let suggestedDepartureTime = $state<Date | undefined>(undefined);

	// Duration editor state
	let showDurationEditor = $state(false);
	let editingTipId = $state(0);
	let editingDuration = $state(60);

	// Settings modal state
	let showSettings = $state(false);

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

	async function searchLocation() {
		// First check if there are matching existing locations
		if (searchQuery && filteredLocations().length > 0) {
			const firstLocation = filteredLocations()[0];
			mapCenter = [firstLocation.latitude, firstLocation.longitude];
			mapZoom = 13;
			showLocationResults = false;
			return;
		}

		// If no existing locations match, search for actual locations
		if (!searchQuery.trim()) {
			showLocationResults = false;
			return;
		}

		isSearchingLocation = true;
		showLocationResults = true;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery)}`
			);
			const results = await response.json();
			locationSearchResults = results;

			// If there's exactly one result, zoom to it
			if (results.length === 1) {
				mapCenter = [parseFloat(results[0].lat), parseFloat(results[0].lon)];
				mapZoom = 13;
			}
		} catch (error) {
			console.error('Location search error:', error);
			locationSearchResults = [];
		} finally {
			isSearchingLocation = false;
		}
	}

	function selectSearchResult(result: any) {
		const lat = parseFloat(result.lat);
		const lon = parseFloat(result.lon);

		// Center map on the location
		mapCenter = [lat, lon];
		mapZoom = 15;

		// If in trip planning mode with an active trip, add as a custom location
		if (currentTrip) {
			// Parse display name to get a better title
			const nameParts = result.display_name.split(',');
			const title = nameParts[0].trim();
			const description = nameParts.slice(0, 3).join(', ').trim();

			// Create a temporary location for this search result
			const tempLocation: TravelTip = {
				id: Date.now(), // Temporary ID based on timestamp
				title: title,
				description: description,
				latitude: lat,
				longitude: lon,
				address: result.display_name,
				category: 'leisure', // Default category
				durationMinutes: 60, // Default duration
				userId: data.user?.id || 'anonymous',
				userName: data.user?.name || 'Anonymous',
				likes: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Add to locations list (temporary)
			locations = [...locations, tempLocation];

			// Add to trip
			addToTrip(tempLocation);
		} else {
			// Not in trip mode, just show the location on map
			// Could potentially show a sheet to create a trip or add this location
		}

		showLocationResults = false;
		searchQuery = '';
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

			// Calculate suggested departure time based on previous stop
			suggestedDepartureTime = calculateSuggestedDepartureTime(stopIndex);
		}

		showTransportEditor = true;
	}

	function calculateSuggestedDepartureTime(stopIndex: number): Date | undefined {
		if (!currentTrip || stopIndex <= 0) return undefined;

		const previousStop = currentTrip.stops[stopIndex - 1];
		const previousLocation = locationsMap.get(previousStop.tipId);
		
		if (!previousLocation) return undefined;

		// Start with trip start date or today
		const baseDate = currentTrip.startDate ? new Date(currentTrip.startDate) : new Date();
		
		// Calculate cumulative time up to this point
		let cumulativeMinutes = 0;
		
		for (let i = 0; i < stopIndex; i++) {
			const stop = currentTrip.stops[i];
			const location = locationsMap.get(stop.tipId);
			
			if (!location) continue;
			
			// Add stay duration at this location
			const stayDuration = stop.customDuration || location.durationMinutes || 60;
			cumulativeMinutes += stayDuration;
			
			// Add transport duration to next location
			if (i < stopIndex - 1 && currentTrip.stops[i + 1].transport) {
				cumulativeMinutes += currentTrip.stops[i + 1].transport.durationMinutes;
			}
		}
		
		// Calculate suggested departure time
		const suggestedTime = new Date(baseDate);
		suggestedTime.setMinutes(suggestedTime.getMinutes() + cumulativeMinutes);
		
		return suggestedTime;
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
		{locationSearchResults}
		{isSearchingLocation}
		{showLocationResults}
		{selectSearchResult}
		onhidelocationresults={() => (showLocationResults = false)}
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
		suggestedDepartureTime={suggestedDepartureTime}
		onsave={saveTransport}
		oncancel={() => (showTransportEditor = false)}
		onopensettings={() => (showSettings = true)}
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

	<SettingsModal bind:open={showSettings} />
</div>
