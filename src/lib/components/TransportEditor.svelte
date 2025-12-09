<!-- src/lib/components/TransportEditor.svelte -->
<script lang="ts">
	import type { TransportSegment, TransportMode } from '$lib/types';
	import { transportInfo } from '$lib/types';
	import { getWalkingRoute, calculateWalkingDuration } from '$lib/utils/routing';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSwap from '~icons/fluent/arrow-swap-24-regular';
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		transport: TransportSegment | null;
		fromLocation: string;
		toLocation: string;
		fromCoords?: [number, number];
		toCoords?: [number, number];
		onsave: (transport: TransportSegment) => void;
		oncancel: () => void;
	}

	let {
		show = $bindable(),
		transport,
		fromLocation,
		toLocation,
		fromCoords,
		toCoords,
		onsave
	}: Props = $props();

	let mode = $state<TransportMode>('railway');
	let departureTime = $state('');
	let arrivalTime = $state('');
	let durationMinutes = $state(30);
	let routeName = $state('');
	let notes = $state('');
	let isCalculatingWalking = $state(false);
	let isSearchingStations = $state(false);
	let isSearchingConnections = $state(false);

	let fromStations = $state<any[]>([]);
	let toStations = $state<any[]>([]);
	let connections = $state<any[]>([]);
	let selectedFromStation = $state<any>(null);
	let selectedToStation = $state<any>(null);
	let showConnectionSearch = $state(false);
	let activeStationSearch = $state<'from' | 'to' | null>(null);

	const DB_API_BASE = 'https://v6.db.transport.rest';

	$effect(() => {
		if (show && transport) {
			mode = transport.mode;
			departureTime = transport.departureTime || '';
			arrivalTime = transport.arrivalTime || '';
			durationMinutes = transport.durationMinutes;
			routeName = transport.routeName || '';
			notes = transport.notes || '';
		} else if (show && !transport) {
			resetForm();
		}
	});

	function resetForm() {
		mode = 'railway';
		departureTime = '';
		arrivalTime = '';
		durationMinutes = 30;
		routeName = '';
		notes = '';
		fromStations = [];
		toStations = [];
		connections = [];
		selectedFromStation = null;
		selectedToStation = null;
		showConnectionSearch = false;
		activeStationSearch = null;
	}

	// Auto-calculate duration when times change
	function updateDuration() {
		if (departureTime && arrivalTime) {
			const [depHour, depMin] = departureTime.split(':').map(Number);
			const [arrHour, arrMin] = arrivalTime.split(':').map(Number);

			let totalMinutes = arrHour * 60 + arrMin - (depHour * 60 + depMin);
			if (totalMinutes < 0) totalMinutes += 24 * 60;

			durationMinutes = totalMinutes;
		}
	}

	// Calculate walking duration when mode changes to walking
	$effect(() => {
		if (mode === 'walking' && fromCoords && toCoords && show) {
			calculateWalkingTime();
		}
	});

	async function calculateWalkingTime() {
		if (!fromCoords || !toCoords) return;

		isCalculatingWalking = true;

		try {
			const route = await getWalkingRoute(fromCoords, toCoords);

			if (route) {
				durationMinutes = route.duration;
				const distanceKm = (route.distance / 1000).toFixed(2);
				notes = `Distance: ${distanceKm} km (calculated at 3.5 km/h)`;
			} else {
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				notes = 'Approximate walking time (straight-line distance)';
			}
		} catch (error) {
			console.error('Error calculating walking time:', error);
			if (fromCoords && toCoords) {
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				notes = 'Approximate walking time (straight-line distance)';
			}
		} finally {
			isCalculatingWalking = false;
		}
	}

	// Search for stations near a specific location
	async function searchStationsNear(location: 'from' | 'to') {
		const coords = location === 'from' ? fromCoords : toCoords;
		if (!coords) return;

		isSearchingStations = true;
		activeStationSearch = location;

		try {
			const stations = await searchOSMStations(coords);

			console.log('Found stations:', stations);

			if (location === 'from') {
				fromStations = stations;
			} else {
				toStations = stations;
			}
		} catch (error) {
			console.error('Error searching stations:', error);
		} finally {
			isSearchingStations = false;
		}
	}

	async function searchOSMStations(coords: [number, number]) {
		const [lat, lon] = coords;
		const radius = 2000; // 2km radius for better coverage

		console.log('Searching OSM stations near:', lat, lon);

		// Overpass query for railway and bus stations
		const query = `
[out:json][timeout:25];
(
  node["railway"="station"](around:${radius},${lat},${lon});
  node["railway"="halt"](around:${radius},${lat},${lon});
  node["railway"="stop"](around:${radius},${lat},${lon});
  node["public_transport"="station"](around:${radius},${lat},${lon});
  node["public_transport"="stop_position"](around:${radius},${lat},${lon});
  node["public_transport"="platform"](around:${radius},${lat},${lon});
  node["highway"="bus_stop"](around:${radius},${lat},${lon});
  way["railway"="station"](around:${radius},${lat},${lon});
  way["public_transport"="station"](around:${radius},${lat},${lon});
);
out center;
>;
out skel qt;
		`.trim();

		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'data=' + encodeURIComponent(query)
		});

		if (!response.ok) {
			console.error('Overpass API error:', response.status, response.statusText);
			throw new Error('Failed to fetch stations');
		}

		const data = await response.json();
		console.log('OSM stations found:', data.elements?.length || 0);

		// Process stations with distance calculation
		const stations = data.elements
			.filter((el: any) => el.tags && (el.tags.name || el.tags.ref))
			.map((el: any) => {
				// For ways, use center coordinates if available
				const elLat = el.center?.lat || el.lat;
				const elLon = el.center?.lon || el.lon;

				if (!elLat || !elLon) return null;

				const distance = getDistanceInMeters(lat, lon, elLat, elLon);

				// Determine type
				let type = 'bus';
				if (
					el.tags.railway === 'station' ||
					el.tags.railway === 'halt' ||
					el.tags.railway === 'stop'
				) {
					type = 'railway';
				} else if (el.tags.public_transport === 'station') {
					type = 'railway';
				}

				return {
					id: el.id,
					name: el.tags.name || el.tags.ref || 'Unnamed Stop',
					type: type,
					lat: elLat,
					lon: elLon,
					distance: distance,
					tags: el.tags
				};
			})
			.filter((s: any) => s !== null);

		console.log('Processed stations:', stations.length);

		// Sort by distance and return top 5
		return stations.sort((a: any, b: any) => a.distance - b.distance).slice(0, 5);
	}

	function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371e3; // Earth's radius in meters
		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;
		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;

		const a =
			Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return Math.round(R * c);
	}

	function formatDistance(meters: number) {
		if (meters < 1000) {
			return `${meters}m`;
		}
		return `${(meters / 1000).toFixed(1)}km`;
	}

	// Search for connections using DB API
	async function searchConnections() {
		if (!selectedFromStation || !selectedToStation) return;

		isSearchingConnections = true;
		showConnectionSearch = true;
		connections = [];

		try {
			const params = new URLSearchParams({
				'from.latitude': selectedFromStation.lat.toString(),
				'from.longitude': selectedFromStation.lon.toString(),
				'to.latitude': selectedToStation.lat.toString(),
				'to.longitude': selectedToStation.lon.toString(),
				results: '8',
				stopovers: 'false'
			});

			const response = await fetch(`${DB_API_BASE}/journeys?${params}`);

			if (!response.ok) throw new Error('Failed to fetch connections');

			const data = await response.json();
			connections = data.journeys || [];
		} catch (error) {
			console.error('Error searching connections:', error);
		} finally {
			isSearchingConnections = false;
		}
	}

	function selectStation(location: 'from' | 'to', station: any) {
		if (location === 'from') {
			selectedFromStation = station;
		} else {
			selectedToStation = station;
		}

		// Auto-search connections when both stations selected
		if (selectedFromStation && selectedToStation) {
			searchConnections();
		}
	}

	function selectConnection(journey: any) {
		// Find the main leg (not walking)
		const mainLeg = journey.legs.find((leg: any) => leg.line) || journey.legs[0];

		const departure = new Date(mainLeg.departure);
		const arrival = new Date(mainLeg.arrival);
		const durationSec = (arrival.getTime() - departure.getTime()) / 1000;

		mode = mainLeg.line?.mode === 'bus' ? 'bus' : 'railway';
		departureTime = departure.toTimeString().slice(0, 5);
		arrivalTime = arrival.toTimeString().slice(0, 5);
		durationMinutes = Math.round(durationSec / 60);
		routeName = mainLeg.line?.name || '';

		const transfers = journey.legs.filter((l: any) => l.line).length - 1;
		notes = transfers > 0 ? `${transfers} transfer(s)` : 'Direct connection';

		showConnectionSearch = false;
	}

	function formatTime(isoString: string) {
		return new Date(isoString).toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
	}

	function handleSave() {
		onsave({
			mode,
			departureTime: departureTime || undefined,
			arrivalTime: arrivalTime || undefined,
			durationMinutes,
			routeName: routeName || undefined,
			notes: notes || undefined
		});
	}
</script>

<Modal bind:open={show} title="Transportation Details">
	<div class="space-y-4">
		<!-- Transport Mode -->
		<div class="form-control">
			<label class="label"><span class="label-text font-medium">Transport Mode</span></label>
			<div class="grid grid-cols-3 gap-2">
				{#each Object.values(transportInfo) as info}
					<button
						class="btn btn-sm"
						class:btn-primary={mode === info.value}
						onclick={() => (mode = info.value)}
					>
						<info.icon class="size-4" />
						{info.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Public Transport Connection Finder -->
		{#if mode !== 'walking'}
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<h3 class="mb-3 text-sm font-semibold">Find Public Transport Connection</h3>

					<!-- From Station Selection -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="text-base-content/70 text-xs font-medium">
								From: {fromLocation}
							</label>
							<button
								class="btn btn-xs btn-ghost"
								onclick={() => searchStationsNear('from')}
								disabled={isSearchingStations || !fromCoords}
							>
								{#if isSearchingStations && activeStationSearch === 'from'}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									<IconSearch class="size-3" />
								{/if}
								Find Stations
							</button>
						</div>

						{#if fromStations.length > 0}
							<div class="space-y-1">
								{#each fromStations as station}
									<button
										class="btn btn-xs btn-ghost w-full justify-start text-left"
										class:btn-active={selectedFromStation?.id === station.id}
										onclick={() => selectStation('from', station)}
									>
										<IconLocation class="size-3 flex-shrink-0" />
										<span class="flex-1 truncate">{station.name}</span>
										<span class="badge badge-xs ml-1 flex-shrink-0">{station.type}</span>
										<span class="text-base-content/50 ml-1 flex-shrink-0 text-xs">
											{formatDistance(station.distance)}
										</span>
									</button>
								{/each}
							</div>
						{/if}

						{#if selectedFromStation}
							<div class="alert alert-success py-2">
								<IconLocation class="size-4" />
								<span class="text-xs">{selectedFromStation.name}</span>
							</div>
						{/if}
					</div>

					<!-- Swap Direction Indicator -->
					{#if selectedFromStation || selectedToStation}
						<div class="flex justify-center">
							<IconSwap class="text-base-content/30 size-5" />
						</div>
					{/if}

					<!-- To Station Selection -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="text-base-content/70 text-xs font-medium">
								To: {toLocation}
							</label>
							<button
								class="btn btn-xs btn-ghost"
								onclick={() => searchStationsNear('to')}
								disabled={isSearchingStations || !toCoords}
							>
								{#if isSearchingStations && activeStationSearch === 'to'}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									<IconSearch class="size-3" />
								{/if}
								Find Stations
							</button>
						</div>

						{#if toStations.length > 0}
							<div class="space-y-1">
								{#each toStations as station}
									<button
										class="btn btn-xs btn-ghost w-full justify-start text-left"
										class:btn-active={selectedToStation?.id === station.id}
										onclick={() => selectStation('to', station)}
									>
										<IconLocation class="size-3 flex-shrink-0" />
										<span class="flex-1 truncate">{station.name}</span>
										<span class="badge badge-xs ml-1 flex-shrink-0">{station.type}</span>
										<span class="text-base-content/50 ml-1 flex-shrink-0 text-xs">
											{formatDistance(station.distance)}
										</span>
									</button>
								{/each}
							</div>
						{/if}

						{#if selectedToStation}
							<div class="alert alert-success py-2">
								<IconLocation class="size-4" />
								<span class="text-xs">{selectedToStation.name}</span>
							</div>
						{/if}
					</div>

					<!-- Connection Search Results -->
					{#if isSearchingConnections}
						<div class="alert mt-3">
							<span class="loading loading-spinner loading-sm"></span>
							<span class="text-sm">Searching connections...</span>
						</div>
					{/if}

					{#if showConnectionSearch && connections.length > 0}
						<div class="mt-3 space-y-2">
							<h4 class="text-base-content/70 text-xs font-semibold">
								Available Connections ({connections.length}):
							</h4>
							<div class="max-h-64 space-y-2 overflow-y-auto">
								{#each connections as journey}
									{@const mainLeg = journey.legs.find((leg: any) => leg.line) || journey.legs[0]}
									{@const departure = mainLeg.departure}
									{@const arrival = journey.legs[journey.legs.length - 1].arrival}
									{@const duration =
										(new Date(arrival).getTime() - new Date(departure).getTime()) / 1000}
									{@const transfers = journey.legs.filter((l: any) => l.line).length - 1}

									<button
										class="btn btn-sm btn-outline hover:btn-primary w-full justify-start text-left"
										onclick={() => selectConnection(journey)}
									>
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<span class="font-semibold">{formatTime(departure)}</span>
												<span class="text-xs">→</span>
												<span class="font-semibold">{formatTime(arrival)}</span>
												<span class="badge badge-xs">{formatDuration(duration)}</span>
											</div>
											<div class="text-base-content/60 truncate text-xs">
												{mainLeg.line?.name || 'Walk'}
												{#if transfers > 0}
													· {transfers} transfer{transfers > 1 ? 's' : ''}
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{:else if showConnectionSearch && connections.length === 0 && !isSearchingConnections}
						<div class="alert alert-warning">
							<span class="text-xs"
								>No connections found. Try different stations or enter manually.</span
							>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if mode === 'walking' && isCalculatingWalking}
			<div class="alert">
				<span class="loading loading-spinner loading-sm"></span>
				<span class="text-sm">Calculating walking route...</span>
			</div>
		{/if}

		<!-- Manual Entry Section -->
		<div class="divider text-xs">Or Enter Manually</div>

		<!-- Times -->
		<div class="grid grid-cols-2 gap-3">
			<div class="form-control">
				<label class="label"><span class="label-text">Departure Time</span></label>
				<input
					type="time"
					class="input input-bordered input-sm"
					bind:value={departureTime}
					oninput={updateDuration}
				/>
			</div>
			<div class="form-control">
				<label class="label"><span class="label-text">Arrival Time</span></label>
				<input
					type="time"
					class="input input-bordered input-sm"
					bind:value={arrivalTime}
					oninput={updateDuration}
				/>
			</div>
		</div>

		<!-- Duration -->
		<div class="form-control">
			<label class="label">
				<span class="label-text">Duration (minutes)</span>
				{#if mode === 'walking'}
					<button
						class="btn btn-xs btn-ghost"
						onclick={calculateWalkingTime}
						disabled={isCalculatingWalking || !fromCoords || !toCoords}
					>
						Recalculate
					</button>
				{/if}
			</label>
			<input
				type="number"
				class="input input-bordered input-sm"
				bind:value={durationMinutes}
				min="1"
				step="1"
				disabled={mode === 'walking' && isCalculatingWalking}
			/>
			<label class="label">
				<span class="label-text-alt text-base-content/60">
					{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
				</span>
			</label>
		</div>

		<!-- Route Name -->
		{#if mode !== 'walking'}
			<div class="form-control">
				<label class="label">
					<span class="label-text">
						{mode === 'railway' ? 'Train Line' : 'Bus Route'}
					</span>
				</label>
				<input
					type="text"
					class="input input-bordered input-sm"
					bind:value={routeName}
					placeholder={mode === 'railway' ? 'e.g., RE7, ICE 123' : 'e.g., Bus 42'}
				/>
			</div>
		{/if}

		<!-- Notes -->
		<div class="form-control">
			<label class="label"><span class="label-text">Notes (optional)</span></label>
			<textarea
				class="textarea textarea-bordered textarea-sm"
				bind:value={notes}
				placeholder="Platform info, transfer details, etc."
				rows="2"
			></textarea>
		</div>

		<!-- Actions -->
		<div class="modal-action">
			<button class="btn btn-primary" onclick={handleSave} disabled={isCalculatingWalking}>
				<IconSave class="size-4" />
				Save Transportation
			</button>
		</div>
	</div>
</Modal>
