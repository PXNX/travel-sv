<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import { getCachedNominatimResults, cacheNominatimResults } from '$lib/db/local';
	import { Button, Modal } from '$lib/components/ui';

	interface Props {
		open: boolean;
		initialLat?: number;
		initialLon?: number;
		onconfirm?: (result: { name: string; lat: number; lon: number }) => void;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		initialLat = 50,
		initialLon = 8,
		onconfirm,
		onclose
	}: Props = $props();

	let activeTab = $state<'search' | 'map'>('search');
	let searchQuery = $state('');
	let searchResults = $state<{ display_name: string; lat: string; lon: string }[]>([]);
	let isSearching = $state(false);

	let selectedLat = $state(50);
	let selectedLon = $state(8);

	$effect.pre(() => {
		selectedLat = initialLat;
	});
	$effect.pre(() => {
		selectedLon = initialLon;
	});

	let debounceTimer: ReturnType<typeof setTimeout>;

	const mapOptions = $derived({
		center: [selectedLat, selectedLon] as [number, number],
		zoom: 13,
		zoomControl: true,
		attributionControl: false
	});

	function handleMapClick(e: { latlng: { lat: number; lng: number } }) {
		selectedLat = e.latlng.lat;
		selectedLon = e.latlng.lng;
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		debounceTimer = setTimeout(() => doSearch(), 400);
	}

	async function doSearch() {
		const q = searchQuery.trim();
		if (!q) return;

		isSearching = true;

		try {
			const cached = await getCachedNominatimResults(q);
			if (cached) {
				searchResults = cached as typeof searchResults;
				isSearching = false;
				return;
			}

			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
			);
			const data = await res.json();
			searchResults = data;

			await cacheNominatimResults(q, data);
		} catch {
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function selectResult(result: { display_name: string; lat: string; lon: string }) {
		onconfirm?.({
			name: result.display_name.split(',')[0].trim(),
			lat: parseFloat(result.lat),
			lon: parseFloat(result.lon)
		});
		open = false;
	}

	function confirmMapSelection() {
		onconfirm?.({
			name: `${selectedLat.toFixed(4)}, ${selectedLon.toFixed(4)}`,
			lat: selectedLat,
			lon: selectedLon
		});
		open = false;
	}
</script>

<Modal bind:open title="Pick Location" size="full" padded={false} {onclose}>
	<div class="flex h-full flex-col">
		<div role="tablist" class="tabs tabs-border shrink-0 px-3 pt-2">
			<button
				role="tab"
				class="tab"
				class:tab-active={activeTab === 'search'}
				onclick={() => (activeTab = 'search')}
			>
				Search
			</button>
			<button
				role="tab"
				class="tab"
				class:tab-active={activeTab === 'map'}
				onclick={() => (activeTab = 'map')}
			>
				Map
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			{#if activeTab === 'search'}
				<input
					class="input mb-2 w-full"
					placeholder="Search for a place..."
					aria-label="Search for a place"
					bind:value={searchQuery}
					oninput={handleSearchInput}
				/>
				{#if isSearching}
					<div class="flex justify-center py-4">
						<span class="loading loading-spinner"></span>
					</div>
				{/if}
				<ul class="menu w-full gap-1">
					{#each searchResults as result (result.display_name)}
						<li>
							<button class="text-left text-sm" onclick={() => selectResult(result)}>
								{result.display_name}
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="h-[55dvh] w-full overflow-hidden rounded-lg sm:h-80">
					<Map options={mapOptions} onclick={handleMapClick}>
						<TileLayer
							url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
							options={{ maxZoom: 19 }}
						/>
						<Marker latLng={[selectedLat, selectedLon]} />
					</Map>
				</div>
				<div class="mt-3 flex items-center justify-between gap-2">
					<span class="text-base-content/60 font-mono text-sm">
						{selectedLat.toFixed(4)}, {selectedLon.toFixed(4)}
					</span>
					<Button size="sm" onclick={confirmMapSelection}>Confirm</Button>
				</div>
			{/if}
		</div>
	</div>
</Modal>
