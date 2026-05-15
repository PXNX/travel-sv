<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import { getCachedNominatimResults, cacheNominatimResults } from '$lib/db/local';
	import IconClose from '~icons/material-symbols/close-rounded';

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

	let selectedLat = $state(initialLat);
	let selectedLon = $state(initialLon);

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

{#if open}
	<div class="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/50">
		<div
			class="bg-base-100 h-[100dvh] w-full sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-xl shadow-xl flex flex-col"
		>
			<div class="flex items-center justify-between border-b border-base-300 p-3">
				<h3 class="font-bold">Pick Location</h3>
				<button
					class="btn btn-ghost btn-sm"
					onclick={() => {
						open = false;
						onclose?.();
					}}
				>
					<IconClose class="h-5 w-5" />
				</button>
			</div>

			<div role="tablist" class="tabs tabs-bordered px-3 pt-2">
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

			<div class="flex-1 overflow-y-auto p-3">
				{#if activeTab === 'search'}
					<input
						class="input input-bordered w-full mb-2"
						placeholder="Search for a place..."
						bind:value={searchQuery}
						oninput={handleSearchInput}
					/>
					{#if isSearching}
						<div class="flex justify-center py-4">
							<span class="loading loading-spinner"></span>
						</div>
					{/if}
					<ul class="menu w-full gap-1">
						{#each searchResults as result}
							<li>
								<button class="text-left text-sm" onclick={() => selectResult(result)}>
									{result.display_name}
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="h-[60dvh] sm:h-80 w-full rounded-lg overflow-hidden">
						<Map options={mapOptions} onclick={handleMapClick}>
							<TileLayer
								url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
								options={{ maxZoom: 19 }}
							/>
							<Marker latLng={[selectedLat, selectedLon]} />
						</Map>
					</div>
					<div class="mt-2 flex items-center justify-between">
						<span class="text-sm text-base-content/60">
							{selectedLat.toFixed(4)}, {selectedLon.toFixed(4)}
						</span>
						<button class="btn btn-primary btn-sm" onclick={confirmMapSelection}>
							Confirm
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
