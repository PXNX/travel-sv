<script lang="ts">
	import { Map, TileLayer, Marker, Polyline } from 'sveaflet';
	import L from 'leaflet';
	import type { Category, TravelTip, Trip, TransportSegment } from '$lib/types';
	import { categoryInfo } from '$lib/types';

	import IconFood from '~icons/fluent/food-24-regular';
	import IconLodging from '~icons/fluent/bed-24-regular';
	import IconPoi from '~icons/fluent/location-24-regular';
	import IconActivity from '~icons/fluent/ticket-24-regular';
	import IconTransport from '~icons/fluent/vehicle-bus-24-regular';
	import IconOther from '~icons/fluent/star-24-regular';
	import Modal from './Modal.svelte';

	interface Props {
		mapCenter: [number, number];
		mapZoom: number;
		filteredLocations: TravelTip[];
		currentTrip: Trip | null;
		routeCoordinates: [number, number][];
		selectedTileLayer: string;
		mapInstance?: L.Map;
		onmarkerclick: (location: TravelTip) => void;
		onlocationselect: (location: TravelTip) => void;
		allLocations: TravelTip[];
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

	let showConfirmDialog = $state(false);
	let pendingLat = $state(0);
	let pendingLng = $state(0);
	let markerInstances: Record<number, L.Marker> = {};
	let markerClickedRecently = false;
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

	const categoryIconComponents: Record<string, typeof IconFood> = {
		food: IconFood,
		lodging: IconLodging,
		poi: IconPoi,
		activity: IconActivity,
		transport: IconTransport,
		other: IconOther
	};

	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371e3;
		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;
		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;

		const a =
			Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}

	function findNearbyLocation(lat: number, lng: number): TravelTip | null {
		let closestLocation: TravelTip | null = null;
		let minDistance = 15;

		for (const location of allLocations) {
			const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
			if (distance <= minDistance) {
				minDistance = distance;
				closestLocation = location;
			}
		}
		return closestLocation;
	}

	function onMapClick(e: L.LeafletMouseEvent) {
		if (markerClickedRecently) {
			markerClickedRecently = false;
			return;
		}

		const lat = e.latlng.lat;
		const lng = e.latlng.lng;

		const nearbyLocation = findNearbyLocation(lat, lng);

		if (nearbyLocation) {
			onlocationselect(nearbyLocation);
			return;
		}

		pendingLat = lat;
		pendingLng = lng;
		showConfirmDialog = true;
	}

	function confirmAddLocation() {
		showConfirmDialog = false;
		window.location.href = `/location/new?lat=${pendingLat}&lng=${pendingLng}`;
	}

	$effect(() => {
		if (mapInstance) {
			mapInstance.on('click', onMapClick);

			Object.entries(markerInstances).forEach(([locationId, marker]) => {
				if (marker) {
					marker.on('click', (e: L.LeafletMouseEvent) => {
						L.DomEvent.stopPropagation(e);
						markerClickedRecently = true;
						const location = allLocations.find((loc) => loc.id === parseInt(locationId));
						if (location) {
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

	function getTripOrder(locationId: number): number | null {
		if (!currentTrip) return null;
		const index = currentTrip.stops.findIndex((s) => s.tipId === locationId);
		return index !== -1 ? index + 1 : null;
	}

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

	const walkingPaths = $derived(() => {
		if (!currentTrip || currentTrip.stops.length < 2) return [];

		const paths: [number, number][][] = [];

		for (let i = 0; i < currentTrip.stops.length - 1; i++) {
			const currentStop = currentTrip.stops[i];
			const nextStop = currentTrip.stops[i + 1];

			const transport: TransportSegment | undefined = nextStop.transport;

			if (transport && transport.mode === 'walk') {
				const fromLocation = allLocations.find((l) => l.id === currentStop.tipId);
				const toLocation = allLocations.find((l) => l.id === nextStop.tipId);

				if (fromLocation && toLocation) {
					paths.push([
						[fromLocation.latitude, fromLocation.longitude],
						[toLocation.latitude, toLocation.longitude]
					]);
				}
			}
		}

		return paths;
	});
</script>

<div class="relative flex-1">
	<Map
		options={{ center: mapCenter, zoom: mapZoom, minZoom: 2, maxZoom: 18, zoomControl: true }}
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

		{#each walkingPaths as path}
			<Polyline
				latLngs={path}
				options={{
					color: '#10b981',
					weight: 6,
					opacity: 0.9,
					lineCap: 'round',
					dashArray: ''
				}}
			/>
		{/each}

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
		class="bg-base-100 absolute top-4 right-4 z-[1000] rounded-lg p-2 shadow-lg"
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
		<p class="text-base-content/70 mb-4 text-sm sm:mb-6">
			Do you want to add a new travel tip at this location?
		</p>

		<div class="flex justify-end gap-2 sm:gap-3">
			<button
				onclick={() => (showConfirmDialog = false)}
				class="btn btn-ghost btn-sm sm:btn-md text-xs sm:text-sm"
			>
				Cancel
			</button>
			<button
				onclick={confirmAddLocation}
				class="btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm"
			>
				Add Location
			</button>
		</div>
	</Modal>
</div>
