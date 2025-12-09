<script lang="ts">
	import { Map, TileLayer, Marker, Polyline } from 'sveaflet';
	import L from 'leaflet';
	import type { Category, TravelTip, Trip, TransportSegment } from '$lib/types';
	import { categoryInfo } from '$lib/types';
	import { getWalkingRoute, type RouteResult } from '$lib/utils/routing';
	import Modal from './Modal.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		mapCenter: [number, number];
		mapZoom: number;
		filteredLocations: TravelTip[];
		currentTrip: Trip | null;
		routeCoordinates: [number, number][];
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

	type TileLayerKey = 'osm' | 'topo' | 'satellite';
	let selectedTileLayer = $state<TileLayerKey>('osm');

	let walkingRoutes = new SvelteMap<string, RouteResult>();

	const tileLayers: Record<TileLayerKey, { url: string; options: { attribution: string } }> = {
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

	const categoryEmojis: Record<string, string> = {
		food: '🍽️',
		nature: '🌲',
		museum: '🏛️',
		leisure: '🛏️',
		other: '⭐'
	};

	function findNearbyLocation(lat: number, lng: number): TravelTip | null {
		if (!mapInstance) return null;

		let closestLocation: TravelTip | null = null;
		let minDistancePixels = 30;

		for (const location of allLocations) {
			const locationLatLng = L.latLng(location.latitude, location.longitude);
			const clickLatLng = L.latLng(lat, lng);

			const locationPoint = mapInstance.latLngToContainerPoint(locationLatLng);
			const clickPoint = mapInstance.latLngToContainerPoint(clickLatLng);

			const pixelDistance = Math.sqrt(
				Math.pow(locationPoint.x - clickPoint.x, 2) + Math.pow(locationPoint.y - clickPoint.y, 2)
			);

			if (pixelDistance <= minDistancePixels) {
				minDistancePixels = pixelDistance;
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

	// Fetch walking routes when trip changes
	$effect(() => {
		if (!currentTrip || currentTrip.stops.length < 2) {
			walkingRoutes = new SvelteMap();
			return;
		}

		async function fetchWalkingRoutes() {
			const newRoutes = new SvelteMap<string, RouteResult>();
			const promises: Promise<void>[] = [];

			for (let i = 0; i < currentTrip!.stops.length - 1; i++) {
				const currentStop = currentTrip!.stops[i];
				const nextStop = currentTrip!.stops[i + 1];

				const transport: TransportSegment | undefined = nextStop.transport;

				if (transport && transport.mode === 'walking') {
					const fromLocation = allLocations.find((l) => l.id === currentStop.tipId);
					const toLocation = allLocations.find((l) => l.id === nextStop.tipId);

					if (fromLocation && toLocation) {
						const key = `${fromLocation.id}-${toLocation.id}`;

						// Check if we already have this route
						if (walkingRoutes.has(key)) {
							newRoutes.set(key, walkingRoutes.get(key)!);
						} else {
							// Fetch new route
							const promise = getWalkingRoute(
								[fromLocation.latitude, fromLocation.longitude],
								[toLocation.latitude, toLocation.longitude]
							)
								.then((route) => {
									if (route) {
										console.log(
											`Fetched walking route with ${route.coordinates.length} points`,
											route
										);
										newRoutes.set(key, route);
									}
								})
								.catch((err) => {
									console.error('Error fetching route:', err);
								});

							promises.push(promise);
						}
					}
				}
			}

			// Wait for all routes to be fetched
			await Promise.all(promises);
			walkingRoutes = newRoutes;
		}

		fetchWalkingRoutes();
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

	const walkingPaths = $derived.by(() => {
		if (!currentTrip || currentTrip.stops.length < 2) return [];

		const paths: { coordinates: [number, number][]; key: string }[] = [];

		for (let i = 0; i < currentTrip.stops.length - 1; i++) {
			const currentStop = currentTrip.stops[i];
			const nextStop = currentTrip.stops[i + 1];

			const transport: TransportSegment | undefined = nextStop.transport;

			if (transport && transport.mode === 'walking') {
				const fromLocation = allLocations.find((l) => l.id === currentStop.tipId);
				const toLocation = allLocations.find((l) => l.id === nextStop.tipId);

				if (fromLocation && toLocation) {
					const key = `${fromLocation.id}-${toLocation.id}`;
					const route = walkingRoutes.get(key);

					if (route && route.coordinates.length > 1) {
						console.log(`Rendering walking path ${key} with ${route.coordinates.length} points`);
						paths.push({ coordinates: route.coordinates, key });
					}
				}
			}
		}

		return paths;
	});

	// Generate non-walking route coordinates (dotted lines)
	const nonWalkingRoutes = $derived.by(() => {
		if (!currentTrip || currentTrip.stops.length < 2) return [];

		const segments: { coordinates: [number, number][]; key: string }[] = [];

		for (let i = 0; i < currentTrip.stops.length - 1; i++) {
			const currentStop = currentTrip.stops[i];
			const nextStop = currentTrip.stops[i + 1];

			const transport: TransportSegment | undefined = nextStop.transport;

			// Only add dotted line if NOT walking
			if (!transport || transport.mode !== 'walking') {
				const fromLocation = allLocations.find((l) => l.id === currentStop.tipId);
				const toLocation = allLocations.find((l) => l.id === nextStop.tipId);

				if (fromLocation && toLocation) {
					segments.push({
						coordinates: [
							[fromLocation.latitude, fromLocation.longitude],
							[toLocation.latitude, toLocation.longitude]
						],
						key: `route-${fromLocation.id}-${toLocation.id}`
					});
				}
			}
		}

		return segments;
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

		{#if currentTrip && nonWalkingRoutes.length > 0}
			{#each nonWalkingRoutes as segment (segment.key)}
				<Polyline
					latLngs={segment.coordinates}
					options={{
						color: '#3b82f6',
						weight: 4,
						opacity: 0.7,
						dashArray: '10, 10'
					}}
				/>
			{/each}
		{/if}

		{#each walkingPaths as path (path.key)}
			<Polyline
				latLngs={path.coordinates}
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
			{@const emoji = categoryEmojis[location.category] || categoryEmojis.other}

			<Marker
				latLng={[location.latitude, location.longitude]}
				bind:instance={markerInstances[location.id]}
			>
				{#if tripOrder !== null}
					<div
						class="flex -translate-x-6 -translate-y-[70px] cursor-pointer flex-col items-center gap-1"
					>
						<div
							class="flex h-12 min-w-12 items-center justify-center rounded-full border-4 border-white text-2xl font-bold text-white shadow-lg"
							style="background-color: {info.color};"
						>
							{tripOrder}
						</div>
						<div
							class="bg-base-content/75 text-base-100 rounded-xl px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-md"
						>
							{duration} min
						</div>
					</div>
				{:else}
					<div
						class="flex h-10 w-10 -translate-x-5 -translate-y-5 cursor-pointer items-center justify-center rounded-full border-3 border-white shadow-lg"
						style="background-color: {info.color};"
					>
						<span class="text-xl leading-none">
							{emoji}
						</span>
					</div>
				{/if}
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
