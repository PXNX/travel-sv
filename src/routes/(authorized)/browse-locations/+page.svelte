<!-- src/routes/(authorized)/browse-locations/+page.svelte -->
<script lang="ts">
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import { Map, TileLayer, Marker } from 'sveaflet';
	import L from 'leaflet';
	import type { SearchResult } from '$lib/services/searchService';
	import { mapSearchResultToPlaceData } from '$lib/services/osmMapper';
	import { categoryInfo, type Category } from '$lib/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Import icons
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconFilter from '~icons/fluent/filter-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-24-regular';

	let searchResults = $state<SearchResult[]>([]);
	let selectedPlace: SearchResult | null = $state(null);
	let mapInstance: L.Map | undefined = $state();
	let selectedCategory = $state<Category | 'all'>('all');
	let searchLocation = $state('Berlin'); // Default search location
	let centerCoords = $state<{ lat: number; lon: number }>({ lat: 52.5200, lon: 13.4050 }); // Berlin
	let mapMarkers: L.Marker[] = $state([]);

	const cities = [
		{ name: 'Berlin', coords: { lat: 52.5200, lon: 13.4050 } },
		{ name: 'Munich', coords: { lat: 48.1351, lon: 11.5820 } },
		{ name: 'Vienna', coords: { lat: 48.2082, lon: 16.3738 } },
		{ name: 'Zürich', coords: { lat: 47.3769, lon: 8.5417 } },
		{ name: 'Hamburg', coords: { lat: 53.5511, lon: 9.9937 } },
		{ name: 'Salzburg', coords: { lat: 47.8095, lon: 13.0550 } }
	];

	function handlePlaceSelect(result: SearchResult) {
		// Add to results if not already there
		if (!searchResults.find(r => r.id === result.id)) {
			searchResults = [...searchResults, result];
		}
		
		// Select and center on map
		selectedPlace = result;
		if (mapInstance) {
			mapInstance.setView([result.latitude, result.longitude], 15);
		}
		
		updateMapMarkers();
	}

	function selectPlace(place: SearchResult) {
		selectedPlace = place;
		if (mapInstance) {
			mapInstance.setView([place.latitude, place.longitude], 15);
		}
	}

	function updateMapMarkers() {
		// Clear existing markers
		mapMarkers.forEach(marker => marker.remove());
		mapMarkers = [];

		if (!mapInstance) return;

		// Add markers for all results
		searchResults.forEach(result => {
			const placeData = mapSearchResultToPlaceData(result);
			const isSelected = selectedPlace?.id === result.id;
			
			const icon = L.divIcon({
				html: `<div style="background-color: ${categoryInfo[placeData.category].color}; width: ${isSelected ? 50 : 40}px; height: ${isSelected ? 50 : 40}px; border-radius: 50%; border: ${isSelected ? 4 : 3}px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? 24 : 20}px;">${categoryInfo[placeData.category].emoji}</div>`,
				className: 'custom-marker',
				iconSize: [isSelected ? 50 : 40, isSelected ? 50 : 40],
				iconAnchor: [isSelected ? 25 : 20, isSelected ? 25 : 20]
			});

			const marker = L.marker([result.latitude, result.longitude], { icon })
				.addTo(mapInstance!)
				.on('click', () => selectPlace(result));

			mapMarkers.push(marker);
		});
	}

	function changeCity(city: { name: string; coords: { lat: number; lon: number } }) {
		searchLocation = city.name;
		centerCoords = city.coords;
		if (mapInstance) {
			mapInstance.setView([city.coords.lat, city.coords.lon], 12);
		}
	}

	function addLocationFromOSM(place: SearchResult) {
		const placeData = mapSearchResultToPlaceData(place);
		
		// Navigate to new location page with pre-filled data
		const params = new URLSearchParams({
			lat: placeData.latitude.toString(),
			lng: placeData.longitude.toString(),
			title: placeData.title
		});
		
		goto(resolve(`/location/new?${params.toString()}`));
	}

	function goBack() {
		goto(resolve('/'));
	}

	// Update markers when results change
	$effect(() => {
		if (searchResults.length > 0) {
			updateMapMarkers();
		}
	});

	$effect(() => {
		if (mapInstance) {
			mapInstance.setView([centerCoords.lat, centerCoords.lon], 12);
		}
	});
</script>

<svelte:head>
	<title>Browse Locations - Travel Planner</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<!-- Header -->
	<div class="bg-primary text-primary-content p-4">
		<div class="container mx-auto flex items-center gap-4">
			<button class="btn btn-ghost btn-sm btn-circle" onclick={goBack}>
				<IconArrowLeft class="h-5 w-5" />
			</button>
			<div class="flex items-center gap-3">
				<IconMap class="h-6 w-6" />
				<h1 class="text-xl font-bold">Browse & Add Locations from OpenStreetMap</h1>
			</div>
		</div>
	</div>

	<div class="container mx-auto p-4">
		<!-- Search and Filter Section -->
		<div class="card bg-base-100 shadow-xl mb-4">
			<div class="card-body">
				<div class="flex flex-col lg:flex-row gap-4">
					<!-- City Selection -->
					<div class="form-control flex-shrink-0">
						<label class="label">
							<span class="label-text font-semibold flex items-center gap-2">
								<IconLocation class="h-4 w-4" />
								Search near:
							</span>
						</label>
						<div class="join">
							{#each cities.slice(0, 3) as city}
								<button
									type="button"
									class="btn join-item btn-sm"
									class:btn-active={searchLocation === city.name}
									onclick={() => changeCity(city)}
								>
									{city.name}
								</button>
							{/each}
						</div>
					</div>

					<!-- Category Filter -->
					<div class="form-control flex-shrink-0">
						<label class="label">
							<span class="label-text font-semibold flex items-center gap-2">
								<IconFilter class="h-4 w-4" />
								Category:
							</span>
						</label>
						<select class="select select-bordered select-sm" bind:value={selectedCategory}>
							<option value="all">All Categories</option>
							{#each Object.values(categoryInfo) as cat}
								<option value={cat.value}>{cat.emoji} {cat.label}</option>
							{/each}
						</select>
					</div>

					<!-- Search -->
					<div class="form-control flex-1">
						<label class="label">
							<span class="label-text font-semibold flex items-center gap-2">
								<IconSearch class="h-4 w-4" />
								Search for places:
							</span>
						</label>
						<SearchAutocomplete
							placeholder="e.g., 'restaurants', 'museums', 'Brandenburg Gate'..."
							searchType="place"
							category={selectedCategory === 'all' ? undefined : selectedCategory}
							nearCoords={centerCoords}
							limit={20}
							onselect={handlePlaceSelect}
							compact={true}
						/>
					</div>
				</div>

				<div class="text-sm text-base-content/60 mt-2">
					<strong>Tip:</strong> Search for specific places (like "Brandenburg Gate") or general categories (like "restaurants near {searchLocation}"). 
					Results will appear on the map and in the list below.
				</div>
			</div>
		</div>

		<!-- Main Content: Map and Results -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Map -->
			<div class="lg:col-span-2 card bg-base-100 shadow-xl">
				<div class="card-body p-0">
					<div class="h-[600px]">
						<Map
							options={{
								center: [centerCoords.lat, centerCoords.lon],
								zoom: 12
							}}
							class="h-full w-full rounded-2xl"
							bind:instance={mapInstance}
						>
							<TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
						</Map>
					</div>
				</div>
			</div>

			<!-- Results List -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						Search Results
						{#if searchResults.length > 0}
							<span class="badge badge-primary">{searchResults.length}</span>
						{/if}
					</h2>

					{#if searchResults.length === 0}
						<div class="text-center py-12 text-base-content/60">
							<IconSearch class="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p class="text-sm">
								No results yet. Search for places above to get started!
							</p>
						</div>
					{:else}
						<div class="max-h-[520px] overflow-y-auto space-y-2 -mx-4 px-4">
							{#each searchResults as place (place.id)}
								{@const placeData = mapSearchResultToPlaceData(place)}
								{@const isSelected = selectedPlace?.id === place.id}
								
								<button
									type="button"
									class="card bg-base-200 w-full text-left hover:bg-base-300 transition-colors"
									class:ring-2={isSelected}
									class:ring-primary={isSelected}
									onclick={() => selectPlace(place)}
								>
									<div class="card-body p-3">
										<div class="flex items-start gap-3">
											<div
												class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
												style="background-color: {categoryInfo[placeData.category].color}20;"
											>
												{categoryInfo[placeData.category].emoji}
											</div>
											<div class="flex-1 min-w-0">
												<h3 class="font-semibold text-sm truncate">{place.name}</h3>
												<p class="text-xs text-base-content/60 truncate">
													{place.type} · {place.city || place.state || place.country}
												</p>
												<div class="flex items-center gap-2 mt-2">
													<span class="badge badge-xs" style="background-color: {categoryInfo[placeData.category].color}; color: white;">
														{categoryInfo[placeData.category].label}
													</span>
													<span class="text-xs text-base-content/50">
														~{placeData.durationMinutes} min
													</span>
												</div>
											</div>
										</div>
										
										<div class="divider my-2"></div>
										
										
									</div>
								</button>

                                <button
											type="button"
											class="btn btn-primary btn-sm w-full gap-2"
											onclick={(e) => {
												e.stopPropagation();
												addLocationFromOSM(place);
											}}
										>
											<IconAdd class="h-4 w-4" />
											Add to My Locations
										</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Info Banner -->
		<div class="alert alert-info mt-4">
			<IconCheckmark class="h-5 w-5" />
			<div class="text-sm">
				<strong>How it works:</strong> Search for places you want to visit, click on them to see details on the map, 
				then click "Add to My Locations" to save them to your travel planner. You'll be able to customize the details before saving.
			</div>
		</div>
	</div>
</div>

<style>
	.custom-marker {
		background: transparent;
		border: none;
	}
</style>
