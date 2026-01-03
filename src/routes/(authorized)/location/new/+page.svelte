<!-- src/routes/location/new/+page.svelte -->
<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import L from 'leaflet';
	import { categoryInfo, bestTimeInfo, type Category, type BestTime } from '$lib/types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import type { SearchResult } from '$lib/services/searchService';
	import { mapSearchResultToPlaceData } from '$lib/services/osmMapper';

	// Import Fluent icons
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconSparkle from '~icons/fluent/sparkle-24-filled';
	import { resolve } from '$app/paths';
	import { reverseGeocode } from '$lib/services/searchService';

	interface Props {
		data: {
			isSignedIn: boolean;
			user?: { id: string; name: string; isAdmin: boolean };
		};
		form?: {
			error?: string;
			duplicateWarning?: {
				title: string;
				distance: number;
			};
		};
	}

	let { data, form }: Props = $props();

	// Get coordinates from URL params or use defaults
	const urlLat = $page.url.searchParams.get('lat');
	const urlLng = $page.url.searchParams.get('lng');
	const urlTitle = $page.url.searchParams.get('title');

	let latitude = $state(urlLat ? parseFloat(urlLat) : 51.505);
	let longitude = $state(urlLng ? parseFloat(urlLng) : -0.09);
	let category = $state<Category>('food');
	let tags = $state<string[]>([]);

	let newTag = $state('');
	let mapInstance: L.Map | undefined = $state();
	let isSubmitting = $state(false);
	let addressInput = $state('');
	let titleInput = $state('');
	let descriptionInput = $state('');
	let durationMinutes = $state(60);
	let bestTimeToVisit = $state<BestTime | ''>('');
	let imageUrl = $state('');
	let googleMapsUrl = $state('');
	let isLoadingPlaceName = $state(false);
	let showOSMSearch = $state(true);
	let osmSearchQuery = $state('');
	let selectedOSMPlace: SearchResult | null = $state(null);

	// Center map on provided coordinates
	$effect(() => {
		if (urlLat && urlLng && mapInstance) {
			mapInstance.setView([latitude, longitude], 15);
		}
	});

	// Fetch place name from coordinates on component mount
	$effect(() => {
		if (urlLat && urlLng && !urlTitle && !titleInput) {
			fetchPlaceName(parseFloat(urlLat), parseFloat(urlLng));
		} else if (urlTitle) {
			titleInput = urlTitle;
		}
	});

	async function fetchPlaceName(lat: number, lng: number) {
		isLoadingPlaceName = true;
		try {
			const result = await reverseGeocode(lat, lng, 18);
			if (result) {
				// Prefer the nearby city name for consistency
				if (result.city) {
					titleInput = result.city;
				} else if (result.name) {
					// Fall back to the place name if no city is available
					titleInput = result.name;
				}
			}
		} catch (error) {
			console.error('Failed to fetch place name:', error);
		} finally {
			isLoadingPlaceName = false;
		}
	}

	function handleOSMPlaceSelect(result: SearchResult) {
		selectedOSMPlace = result;
		
		// Map OSM data to our format
		const placeData = mapSearchResultToPlaceData(result);
		
		// Auto-fill the form
		titleInput = placeData.title;
		descriptionInput = placeData.description;
		category = placeData.category;
		durationMinutes = placeData.durationMinutes;
		latitude = placeData.latitude;
		longitude = placeData.longitude;
		addressInput = placeData.address;
		
		// Update map view
		if (mapInstance) {
			mapInstance.setView([latitude, longitude], 16);
		}
		
		// Hide search after selection
		showOSMSearch = false;
	}

	function clearOSMSelection() {
		selectedOSMPlace = null;
		showOSMSearch = true;
		osmSearchQuery = '';
	}

	function toggleOSMSearch() {
		showOSMSearch = !showOSMSearch;
		if (!showOSMSearch) {
			osmSearchQuery = '';
		}
	}

	function getCategoryIcon(cat: Category) {
		const info = categoryInfo[cat];
		return L.divIcon({
			html: `<div style="background-color: ${info.color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">${info.icon}</div>`,
			className: 'custom-marker',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
	}

	function handleMapClick(e: L.LeafletMouseEvent) {
		latitude = e.latlng.lat;
		longitude = e.latlng.lng;
	}

	function addTag() {
		if (newTag.trim() && !tags.includes(newTag.trim())) {
			tags = [...tags, newTag.trim()];
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	async function searchAddress() {
		if (!addressInput.trim()) return;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressInput)}`
			);
			const results = await response.json();

			if (results.length > 0) {
				latitude = parseFloat(results[0].lat);
				longitude = parseFloat(results[0].lon);
				mapInstance?.setView([latitude, longitude], 15);
			} else {
				alert('Location not found. Please try a different address or click on the map.');
			}
		} catch (error) {
			console.error('Search error:', error);
			alert('Failed to search for address. Please try again.');
		}
	}

	function cancel() {
		goto(resolve('/'));
	}
</script>

<div class="bg-base-200 min-h-screen">
	<!-- Header -->
	<div class="bg-primary text-primary-content p-4">
		<div class="container mx-auto flex items-center gap-4">
			<button class="btn btn-ghost btn-sm btn-circle" onclick={cancel}>
				<IconArrowLeft class="h-5 w-5" />
			</button>
			<h1 class="text-xl font-bold">Add New Location</h1>
		</div>
	</div>

	<div class="container mx-auto max-w-4xl p-4">
		{#if form?.error}
			<div class="alert alert-error mb-6">
				<IconDismiss class="h-5 w-5" />
				<span>{form.error}</span>
			</div>
		{/if}

		{#if form?.duplicateWarning}
			<div class="alert alert-warning mb-6">
				<IconWarning class="h-5 w-5" />
				<div>
					<div class="font-bold">Possible Duplicate Location</div>
					<div class="text-sm">
						There's already a location "{form.duplicateWarning.title}" within
						{form.duplicateWarning.distance}m of this position. Please verify this isn't a
						duplicate.
					</div>
				</div>
			</div>
		{/if}

		<!-- OSM Search Section -->
		<div class="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl mb-6">
			<div class="card-body">
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-2">
							<IconSparkle class="h-6 w-6 text-primary" />
							<h2 class="card-title">Search OpenStreetMap Places</h2>
						</div>
						<p class="text-base-content/70 text-sm mb-4">
							Search for restaurants, museums, parks, and more from OpenStreetMap. We'll auto-fill the details for you!
						</p>

						{#if showOSMSearch}
							<SearchAutocomplete
								placeholder="Search for places (e.g., 'Brandenburg Gate', 'Hofbräuhaus München')..."
								searchType="place"
								category={category}
								limit={15}
								onselect={handleOSMPlaceSelect}
								autofocus={!selectedOSMPlace}
							/>
							
							<div class="mt-3 text-xs text-base-content/60">
								<strong>Tip:</strong> Select a category below first for better results, or search broadly and we'll detect the category.
							</div>
						{:else}
							<div class="alert alert-success">
								<IconSearch class="h-5 w-5" />
								<div class="flex-1">
									<div class="font-semibold">Place selected: {selectedOSMPlace?.name}</div>
									<div class="text-xs opacity-80">Form auto-filled from OpenStreetMap data. You can edit any field below.</div>
								</div>
								<button type="button" class="btn btn-ghost btn-sm" onclick={clearOSMSelection}>
									Search Again
								</button>
							</div>
						{/if}
					</div>
				</div>

				{#if !showOSMSearch}
					<div class="divider text-xs">OR</div>
					<button type="button" class="btn btn-outline btn-sm" onclick={toggleOSMSearch}>
						<IconSearch class="h-4 w-4" />
						Search for a different place
					</button>
				{/if}
			</div>
		</div>

		<form
			method="POST"
			class="grid grid-cols-1 gap-6 lg:grid-cols-2"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					await update();
				};
			}}
		>
			<!-- Hidden fields -->
			<input type="hidden" name="latitude" value={latitude} />
			<input type="hidden" name="longitude" value={longitude} />
			<input type="hidden" name="category" value={category} />
			<input type="hidden" name="tags" value={JSON.stringify(tags)} />

			<!-- Form -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">Location Details</h2>

					<div class="space-y-4">
						<div class="form-control">
							<label class="label"><span class="label-text">Title *</span></label>
							<input
								type="text"
								name="title"
								class="input input-bordered"
								placeholder="Name of the place"
								bind:value={titleInput}
								disabled={isLoadingPlaceName}
								required
							/>
							{#if isLoadingPlaceName}
								<label class="label">
									<span class="label-text-alt text-info">Loading place name...</span>
								</label>
							{/if}
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Description *</span></label>
							<textarea
								name="description"
								class="textarea textarea-bordered h-24"
								placeholder="Tell us about this place..."
								bind:value={descriptionInput}
								required
							></textarea>
							{#if selectedOSMPlace}
								<label class="label">
									<span class="label-text-alt text-info">
										Auto-generated description. Feel free to customize it!
									</span>
								</label>
							{/if}
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Address</span></label>
							<div class="flex gap-2">
								<input
									type="text"
									name="address"
									class="input input-bordered flex-1"
									bind:value={addressInput}
									placeholder="Street address or place name"
									onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
								/>
								<button type="button" class="btn btn-square" onclick={searchAddress}>
									<IconLocation class="h-5 w-5" />
								</button>
							</div>
							<label class="label">
								<span class="label-text-alt">Or click on the map to set location</span>
							</label>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="form-control">
								<label class="label"><span class="label-text">Category *</span></label>
								<select class="select select-bordered" bind:value={category}>
									{#each Object.values(categoryInfo) as cat}
										<option value={cat.value}>{cat.emoji} {cat.label}</option>
									{/each}
								</select>
								{#if selectedOSMPlace}
									<label class="label">
										<span class="label-text-alt text-info">Auto-detected from OSM</span>
									</label>
								{/if}
							</div>

							<div class="form-control">
								<label class="label"><span class="label-text">Duration (min) *</span></label>
								<input
									type="number"
									name="duration_minutes"
									class="input input-bordered"
									bind:value={durationMinutes}
									min="15"
									step="15"
									required
								/>
								{#if selectedOSMPlace}
									<label class="label">
										<span class="label-text-alt text-info">Estimated duration</span>
									</label>
								{/if}
							</div>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Best Time to Visit</span></label>
							<select name="best_time_to_visit" class="select select-bordered" bind:value={bestTimeToVisit}>
								<option value="">Not specified</option>
								{#each Object.values(bestTimeInfo) as time}
									<option value={time.value}>{time.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Image URL</span></label>
							<input
								type="url"
								name="image_url"
								class="input input-bordered"
								placeholder="https://example.com/image.jpg"
								bind:value={imageUrl}
							/>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Google Maps URL</span></label>
							<input
								type="url"
								name="google_maps_url"
								class="input input-bordered"
								placeholder="https://maps.google.com/..."
								bind:value={googleMapsUrl}
							/>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Tags</span></label>
							<div class="flex gap-2">
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={newTag}
									placeholder="Add a tag..."
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addTag();
										}
									}}
								/>
								<button type="button" class="btn" onclick={addTag}>Add</button>
							</div>
							{#if tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each tags as tag (tag)}
										<div class="badge badge-lg gap-2">
											{tag}
											<button
												type="button"
												class="btn btn-ghost btn-xs btn-circle"
												onclick={() => removeTag(tag)}
											>
												<IconDismiss class="h-3 w-3" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="divider"></div>

						<div class="flex gap-3">
							<button
								type="button"
								class="btn btn-ghost flex-1"
								onclick={cancel}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary flex-1 gap-2" disabled={isSubmitting}>
								<IconSave class="h-4 w-4" />
								{isSubmitting ? 'Adding...' : 'Add Location'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Map -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body p-0">
					<div class="h-[600px]">
						<Map
							options={{
								center: [latitude, longitude],
								zoom: 13
							}}
							class="h-full w-full rounded-2xl"
							bind:instance={mapInstance}
							on:click={handleMapClick}
						>
							<TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
							<Marker latLng={[latitude, longitude]} icon={getCategoryIcon(category)} />
						</Map>
					</div>
					<div class="p-4">
						<p class="text-base-content/70 text-sm">
							Click on the map to set the location, or enter an address and click the search button.
						</p>
						<p class="text-base-content/50 mt-2 text-xs">
							Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
						</p>
						{#if selectedOSMPlace}
							<div class="mt-2 badge badge-success badge-sm">
								📍 Location from OSM: {selectedOSMPlace.name}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</form>
	</div>
</div>
