<!-- src/routes/(authorized)/search-demo/+page.svelte -->
<script lang="ts">
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import type { SearchResult } from '$lib/services/searchService';
	import IconLocationIcon from '~icons/fluent/location-24-regular';
	import IconPin from '~icons/fluent/pin-24-filled';
	import IconMap from '~icons/fluent/map-24-regular';

	let locationResult = $state<SearchResult | null>(null);
	let placeResult = $state<SearchResult | null>(null);
	let selectedCategory = $state<'food' | 'museum' | 'leisure' | 'nature' | 'shopping' | 'attraction'>('food');
	let nearCoords = $state<{ lat: number; lon: number }>({ lat: 48.1351, lon: 11.5820 }); // Munich

	function handleLocationSelect(result: SearchResult) {
		locationResult = result;
		console.log('Location selected:', result);
	}

	function handlePlaceSelect(result: SearchResult) {
		placeResult = result;
		console.log('Place selected:', result);
	}

	const categories = [
		{ value: 'food', label: 'Food & Dining', emoji: '🍽️' },
		{ value: 'museum', label: 'Museums & Culture', emoji: '🏛️' },
		{ value: 'leisure', label: 'Leisure & Entertainment', emoji: '🎭' },
		{ value: 'nature', label: 'Nature & Outdoors', emoji: '🌳' },
		{ value: 'shopping', label: 'Shopping', emoji: '🛍️' },
		{ value: 'attraction', label: 'Tourist Attractions', emoji: '🎡' }
	] as const;

	const cities = [
		{ name: 'Berlin', coords: { lat: 52.5200, lon: 13.4050 } },
		{ name: 'Munich', coords: { lat: 48.1351, lon: 11.5820 } },
		{ name: 'Vienna', coords: { lat: 48.2082, lon: 16.3738 } },
		{ name: 'Zürich', coords: { lat: 47.3769, lon: 8.5417 } },
		{ name: 'Vaduz', coords: { lat: 47.1410, lon: 9.5209 } }
	];
</script>

<svelte:head>
	<title>Search Demo - Travel Planner</title>
</svelte:head>

<div class="min-h-screen bg-base-200 p-4 sm:p-6 lg:p-8">
	<div class="mx-auto max-w-6xl">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="flex items-center justify-center gap-3 mb-4">
				<IconMap class="text-primary size-12" />
				<h1 class="text-4xl font-bold">Search Feature Demo</h1>
			</div>
			<p class="text-base-content/70 text-lg">
				Test the dual search functionality: Locations vs Places
			</p>
			<div class="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
				<span class="badge badge-primary">🇩🇪 Germany</span>
				<span class="badge badge-primary">🇦🇹 Austria</span>
				<span class="badge badge-primary">🇨🇭 Switzerland</span>
				<span class="badge badge-primary">🇱🇮 Liechtenstein</span>
			</div>
		</div>

		<!-- Demo Grid -->
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Location Search -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title flex items-center gap-2">
						<IconLocationIcon class="text-primary size-6" />
						Location Search
					</h2>
					<p class="text-base-content/70 text-sm mb-4">
						Search for cities, towns, addresses, and geographic locations
					</p>

					<div class="form-control mb-4">
						<label class="label">
							<span class="label-text font-semibold">Try searching for:</span>
						</label>
						<SearchAutocomplete
							placeholder="e.g., Berlin, Zürich, Vienna..."
							searchType="location"
							limit={10}
							onselect={handleLocationSelect}
						/>
					</div>

					<div class="text-base-content/60 space-y-2 text-sm">
						<p class="font-semibold">Examples to try:</p>
						<ul class="list-disc list-inside space-y-1 ml-2">
							<li>Berlin, Germany</li>
							<li>Salzburg, Austria</li>
							<li>Interlaken, Switzerland</li>
							<li>Schwarzwald (Black Forest)</li>
							<li>Marienplatz München</li>
						</ul>
					</div>

					{#if locationResult}
						<div class="divider"></div>
						<div class="alert alert-success">
							<IconLocationIcon class="size-5" />
							<div class="flex-1">
								<h3 class="font-bold">{locationResult.name}</h3>
								<div class="text-xs opacity-80">{locationResult.displayName}</div>
								<div class="mt-2 flex gap-4 text-xs">
									<span>📍 {locationResult.latitude.toFixed(4)}, {locationResult.longitude.toFixed(4)}</span>
									<span>🏷️ {locationResult.type}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Place Search -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title flex items-center gap-2">
						<IconPin class="text-secondary size-6" />
						Place Search (POI)
					</h2>
					<p class="text-base-content/70 text-sm mb-4">
						Search for specific points of interest like restaurants, museums, hotels
					</p>

					<div class="form-control mb-4">
						<label class="label">
							<span class="label-text font-semibold">Select Category:</span>
						</label>
						<select class="select select-bordered w-full" bind:value={selectedCategory}>
							{#each categories as cat}
								<option value={cat.value}>{cat.emoji} {cat.label}</option>
							{/each}
						</select>
					</div>

					<div class="form-control mb-4">
						<label class="label">
							<span class="label-text font-semibold">Search near:</span>
						</label>
						<div class="join w-full">
							{#each cities as city}
								<button
									class="btn join-item btn-sm flex-1"
									class:btn-active={nearCoords.lat === city.coords.lat}
									onclick={() => (nearCoords = city.coords)}
								>
									{city.name}
								</button>
							{/each}
						</div>
					</div>

					<div class="form-control mb-4">
						<label class="label">
							<span class="label-text font-semibold">Search for places:</span>
						</label>
						<SearchAutocomplete
							placeholder={`Search ${categories.find(c => c.value === selectedCategory)?.label.toLowerCase()}...`}
							searchType="place"
							category={selectedCategory}
							limit={10}
							nearCoords={nearCoords}
							onselect={handlePlaceSelect}
						/>
					</div>

					<div class="text-base-content/60 space-y-2 text-sm">
						<p class="font-semibold">Examples by category:</p>
						<ul class="list-disc list-inside space-y-1 ml-2">
							<li><strong>Food:</strong> Hofbräuhaus, Café Central</li>
							<li><strong>Museums:</strong> Pergamon, Kunsthistorisches</li>
							<li><strong>Nature:</strong> Englischer Garten, Tiergarten</li>
							<li><strong>Leisure:</strong> Europa-Park, Prater</li>
						</ul>
					</div>

					{#if placeResult}
						<div class="divider"></div>
						<div class="alert alert-info">
							<IconPin class="size-5" />
							<div class="flex-1">
								<h3 class="font-bold">{placeResult.name}</h3>
								<div class="text-xs opacity-80">{placeResult.displayName}</div>
								<div class="mt-2 flex flex-wrap gap-2 text-xs">
									<span class="badge badge-sm">📍 {placeResult.latitude.toFixed(4)}, {placeResult.longitude.toFixed(4)}</span>
									<span class="badge badge-sm">🏷️ {placeResult.type}</span>
									{#if placeResult.city}
										<span class="badge badge-sm">🏙️ {placeResult.city}</span>
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Information Section -->
		<div class="card bg-base-100 mt-6 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">How It Works</h2>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<h3 class="font-bold mb-2 flex items-center gap-2">
							<IconLocationIcon class="size-5" />
							Location Search
						</h3>
						<ul class="text-sm space-y-1 list-disc list-inside text-base-content/70">
							<li>Searches for geographic locations</li>
							<li>Includes cities, towns, villages, addresses</li>
							<li>Returns administrative boundaries</li>
							<li>Best for navigation and trip planning</li>
							<li>Uses OSM settlement and address data</li>
						</ul>
					</div>
					<div>
						<h3 class="font-bold mb-2 flex items-center gap-2">
							<IconPin class="size-5" />
							Place Search (POI)
						</h3>
						<ul class="text-sm space-y-1 list-disc list-inside text-base-content/70">
							<li>Searches for specific points of interest</li>
							<li>Includes restaurants, museums, hotels, parks</li>
							<li>Can filter by category</li>
							<li>Supports proximity-based sorting</li>
							<li>Uses OSM tourism, amenity, and leisure tags</li>
						</ul>
					</div>
				</div>

				<div class="divider"></div>

				<div>
					<h3 class="font-bold mb-2">Features</h3>
					<div class="flex flex-wrap gap-2">
						<span class="badge badge-outline">🔍 Fuzzy Autocomplete</span>
						<span class="badge badge-outline">⌨️ Keyboard Navigation</span>
						<span class="badge badge-outline">⚡ Debounced Search</span>
						<span class="badge badge-outline">🌍 Country Restricted</span>
						<span class="badge badge-outline">📍 Proximity Sort</span>
						<span class="badge badge-outline">♿ Accessible</span>
						<span class="badge badge-outline">🚀 Rate Limited</span>
					</div>
				</div>

				<div class="divider"></div>

				<div class="text-sm text-base-content/60">
					<p class="mb-2">
						<strong>Data Source:</strong> OpenStreetMap Nominatim API
					</p>
					<p>
						<strong>Attribution:</strong> © OpenStreetMap contributors
					</p>
				</div>
			</div>
		</div>

		<!-- Back Button -->
		<div class="mt-6 text-center">
			<a href="/" class="btn btn-primary btn-lg">
				← Back to Travel Planner
			</a>
		</div>
	</div>
</div>
