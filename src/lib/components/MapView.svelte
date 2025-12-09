<script lang="ts">
	import { Map, TileLayer, Polyline } from 'sveaflet';
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

	function createMarkerIcon(location: TravelTip): L.DivIcon {
		const info = categoryInfo[location.category];
		const tripOrder = getTripOrder(location.id);
		const duration = getDuration(location.id);
		const emoji = categoryEmojis[location.category] || categoryEmojis.other;

		let html = '';
		if (tripOrder !== null) {
			html = `
				<div style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
					<div style="display: flex; align-items: center; justify-content: center; height: 48px; min-width: 48px; border-radius: 9999px; border: 4px solid white; font-size: 24px; font-weight: bold; color: white; background-color: ${info.color}; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
						${tripOrder}
					</div>
					<div style="background-color: rgba(0, 0, 0, 0.75); color: white; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
						${duration} min
					</div>
				</div>
			`;
		} else {
			html = `
				<div style="display: flex; align-items: center; justify-content: center; height: 40px; width: 40px; border-radius: 9999px; border: 3px solid white; background-color: ${info.color}; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
					<span style="font-size: 20px; line-height: 1;">
						${emoji}
					</span>
				</div>
			`;
		}

		return L.divIcon({
			className: 'custom-div-icon',
			html: html,
			iconSize: tripOrder !== null ? [60, 80] : [40, 40],
			iconAnchor: tripOrder !== null ? [30, 40] : [20, 20]
		});
	}

	function updateMarkers() {
		if (!mapInstance) return;

		// Remove existing markers
		Object.values(markerInstances).forEach((marker) => {
			if (marker) {
				mapInstance.removeLayer(marker);
			}
		});
		markerInstances = {};

		// Add new markers
		filteredLocations.forEach((location) => {
			const icon = createMarkerIcon(location);
			const marker = L.marker([location.latitude, location.longitude], {
				icon: icon,
				zIndexOffset: 1000
			});

			marker.on('click', (e: L.LeafletMouseEvent) => {
				L.DomEvent.stopPropagation(e);
				markerClickedRecently = true;
				onmarkerclick(location);
			});

			marker.addTo(mapInstance);
			markerInstances[location.id] = marker;
		});
	}

	$effect(() => {
		if (mapInstance) {
			// Set proper z-index for marker pane
			const markerPane = mapInstance.getPane('markerPane');
			if (markerPane) {
				markerPane.style.zIndex = '650';
			}

			mapInstance.on('click', onMapClick);

			return () => {
				mapInstance.off('click', onMapClick);
			};
		}
	});

	// Update markers when locations or trip changes
	$effect(() => {
		if (mapInstance && filteredLocations) {
			// Access currentTrip to make this effect reactive to it
			const _ = currentTrip;
			updateMarkers();
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

						if (walkingRoutes.has(key)) {
							newRoutes.set(key, walkingRoutes.get(key)!);
						} else {
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

			await Promise.all(promises);
			walkingRoutes = newRoutes;
		}

		fetchWalkingRoutes();
	});

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

	const nonWalkingRoutes = $derived.by(() => {
		if (!currentTrip || currentTrip.stops.length < 2) return [];

		const segments: { coordinates: [number, number][]; key: string }[] = [];

		for (let i = 0; i < currentTrip.stops.length - 1; i++) {
			const currentStop = currentTrip.stops[i];
			const nextStop = currentTrip.stops[i + 1];

			const transport: TransportSegment | undefined = nextStop.transport;

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

<svelte:head>
	<style>
		.custom-div-icon {
			background: transparent !important;
			border: none !important;
		}
		.leaflet-marker-pane {
			z-index: 650 !important;
		}
		.leaflet-tile-pane {
			z-index: 200 !important;
		}
	</style>
</svelte:head>

<div class="relative flex-1">
	<Map
		options={{ center: mapCenter, zoom: mapZoom, minZoom: 2, maxZoom: 18, zoomControl: true }}
		class="h-full w-full"
		bind:instance={mapInstance}
	>
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

		{#key selectedTileLayer}
			{@const tile = tileLayers[selectedTileLayer]}
			<TileLayer url={tile.url} options={tile.options} />
		{/key}
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
