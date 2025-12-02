<script lang="ts">
	import { Map, TileLayer, Marker, Polyline } from 'sveaflet';
	import L from 'leaflet';
	import type { Category, TravelTip, Trip } from '$lib/types';
	import { categoryInfo } from '$lib/types';

	// --- NEW: Import fluent icons ---
	// Adjust these imports to match your categories and desired icons
	import IconFood from '~icons/fluent/food-24-regular';
	import IconLodging from '~icons/fluent/bed-24-regular';
	import IconPoi from '~icons/fluent/location-24-regular';
	import IconActivity from '~icons/fluent/ticket-24-regular';
	import IconTransport from '~icons/fluent/vehicle-bus-24-regular';
	import IconOther from '~icons/fluent/star-24-regular';
	import Modal from './Modal.svelte';
	// --- End NEW ---

	interface Props {
		mapCenter: [number, number];
		mapZoom: number;
		filteredLocations: TravelTip[];
		currentTrip: Trip | null;
		routeCoordinates: [number, number][];
		mapInstance?: L.Map;
		onmarkerclick: (location: TravelTip) => void;
		onlocationselect: (location: TravelTip) => void;
		allLocations: TravelTip[]; // All locations for proximity check
	}

	let {
		mapCenter,
		mapZoom,
		filteredLocations,
		currentTrip,
		routeCoordinates,
		mapInstance = $bindable(),
		onmarkerclick,
		onlocationselect,
		allLocations
	}: Props = $props();

	// Confirmation dialog state
	let showConfirmDialog = $state(false);
	let pendingLat = $state(0);
	let pendingLng = $state(0);

	// Store marker instances and track if marker was clicked
	let markerInstances: Record<number, L.Marker> = {};
	let markerClickedRecently = false;

	// Tile Layer State
	let selectedTileLayer = $state('osm'); // 'osm', 'topo', 'satellite'

	const tileLayers = {
		osm: {
			url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			options: {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}
		},
		topo: {
			url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
			options: {
				attribution:
					'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
			}
		},
		satellite: {
			url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			options: {
				attribution:
					'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
			}
		}
	};

	// --- NEW: Map category keys to icon components ---
	// IMPORTANT: Adjust the keys ('food', 'lodging', etc.) to match
	// the exact string values of your `Category` type.
	const categoryIconComponents: Record<string, typeof IconFood> = {
		food: IconFood,
		lodging: IconLodging,
		poi: IconPoi,
		activity: IconActivity,
		transport: IconTransport,
		other: IconOther
	};
	// --- End NEW ---

	// Calculate distance between two coordinates in meters
	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371e3; // Earth's radius in meters
		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;
		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;

		const a =
			Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c; // Distance in meters
	}

	// Find the closest location within 15m
	function findNearbyLocation(lat: number, lng: number): TravelTip | null {
		let closestLocation: TravelTip | null = null;
		let minDistance = 15; // The threshold in meters

		for (const location of allLocations) {
			const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
			if (distance <= minDistance) {
				minDistance = distance;
				closestLocation = location;
			}
		}
		return closestLocation;
	}

	// Handle map click with proximity check
	function onMapClick(e: L.LeafletMouseEvent) {
		// If a marker was just clicked, ignore this map click
		if (markerClickedRecently) {
			markerClickedRecently = false;
			return;
		}

		const lat = e.latlng.lat;
		const lng = e.latlng.lng;

		// Check if there's a location nearby
		const nearbyLocation = findNearbyLocation(lat, lng);

		if (nearbyLocation) {
			// **FIX:** Location exists nearby, call the direct 'select' prop
			// This bypasses the 'add to trip' logic.
			onlocationselect(nearbyLocation);
			return;
		}

		// No nearby location, show confirmation
		pendingLat = lat;
		pendingLng = lng;
		showConfirmDialog = true;
	}

	function confirmAddLocation() {
		showConfirmDialog = false;
		// Navigate to new location page
		window.location.href = `/location/new?lat=${pendingLat}&lng=${pendingLng}`;
	}


	// Attach map click handler and marker click handlers
	$effect(() => {
		if (mapInstance) {
			mapInstance.on('click', onMapClick);

			// Add click handlers to all markers
			Object.entries(markerInstances).forEach(([locationId, marker]) => {
				if (marker) {
					marker.on('click', (e: L.LeafletMouseEvent) => {
						L.DomEvent.stopPropagation(e);
						markerClickedRecently = true;
						const location = allLocations.find((loc) => loc.id === parseInt(locationId));
						if (location) {
							// This is a TRUE marker click, so we call the markerclick prop
							onmarkerclick(location);
						}
					});
				}
			});

			return () => {
				mapInstance.off('click', onMapClick);
				Object.values(markerInstances).forEach((marker) => {
					if (marker) {
						marker.off('click');
					}
				});
			};
		}
	});

	// Get trip order for a location
	function getTripOrder(locationId: number): number | null {
		if (!currentTrip) return null;
		const index = currentTrip.stops.findIndex((s) => s.tipId === locationId);
		return index !== -1 ? index + 1 : null;
	}

	// Get duration for a location (custom or default)
	function getDuration(locationId: number): number {
		const location = allLocations.find((l) => l.id === locationId);
		if (!location) return 60;

		if (currentTrip) {
			const stop = currentTrip.stops.find((s) => s.tipId === locationId);
			if (stop && typeof stop.customDuration === 'number') {
				return stop.customDuration;
			}
		}

		return location.durationMinutes;
	}

	// --- REMOVED: getCategoryIcon function is no longer needed ---
</script>

<div class="relative flex-1">
	<Map
		options={{ center: mapCenter, zoom: mapZoom, minZoom: 2, maxZoom: 18, zoomControl: false }}
		class="h-full w-full"
		bind:instance={mapInstance}
	>
		{#key selectedTileLayer}
			{@const tile = tileLayers[selectedTileLayer]}
			<TileLayer url={tile.url} options={tile.options} />
		{/key}

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

		{#each filteredLocations as location (location.id)}
			{@const info = categoryInfo[location.category]}
			{@const tripOrder = getTripOrder(location.id)}
			{@const duration = getDuration(location.id)}
			{@const iconComponent = categoryIconComponents[location.category] || IconOther}

			<Marker
				latLng={[location.latitude, location.longitude]}
				bind:instance={markerInstances[location.id]}
			>
				<svelte:fragment slot="icon">
					{#if tripOrder !== null}
						<div
							style="position: relative; top: -70px; left: -24px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;"
						>
							<div
								style="background-color: {info.color}; min-width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white;"
							>
								{tripOrder}
							</div>
							<div
								style="background-color: rgba(0,0,0,0.75); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"
							>
								{duration} min
							</div>
						</div>
					{:else}
						<div
							style="position: relative; top: -16px; left: -16px; background-color: {info.color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer;"
						>
							<svelte:component this={iconComponent} style="font-size: 18px; color: white;" />
						</div>
					{/if}
				</svelte:fragment>
			</Marker>
		{/each}
		</Map>

	<div
		class="absolute top-4 right-4 z-[1000] rounded-lg bg-base-100 p-2 shadow-lg"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="form-control">
			<label class="label cursor-pointer gap-2 py-1">
				<span class="label-text text-sm">Street</span>
				<input
					type="radio"
					name="tile-layer"
					class="radio radio-primary radio-sm"
					bind:group={selectedTileLayer}
					value="osm"
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="label cursor-pointer gap-2 py-1">
				<span class="label-text text-sm">Topo</span>
				<input
					type="radio"
					name="tile-layer"
					class="radio radio-primary radio-sm"
					bind:group={selectedTileLayer}
					value="topo"
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="label cursor-pointer gap-2 py-1">
				<span class="label-text text-sm">Satellite</span>
				<input
					type="radio"
					name="tile-layer"
					class="radio radio-primary radio-sm"
					bind:group={selectedTileLayer}
					value="satellite"
				/>
			</label>
		</div>
	</div>



	<Modal bind:open={showConfirmDialog} title="Add New Location?">
				<p class="text-gray-600 mb-6">Do you want to add a new travel tip at this location?</p>

				<div class="flex gap-3 justify-end">
				
					<button onclick={confirmAddLocation} class="btn btn-primary"> Add Location </button>
				</div>
		

</Modal>
</div>