<!-- src/lib/components/SearchAutocomplete.svelte -->
<script lang="ts">
	import type { SearchResult } from '$lib/services/searchService';
	import { createDebouncedSearch, searchLocations, searchPlaces, type PlaceCategory } from '$lib/services/searchService';
	import IconSearch from '~icons/fluent/search-24-regular';
	import IconLocationIcon from '~icons/fluent/location-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconPin from '~icons/fluent/pin-24-filled';

	interface Props {
		placeholder?: string;
		searchType?: 'location' | 'place';
		category?: PlaceCategory;
		limit?: number;
		onselect?: (result: SearchResult) => void;
		onclear?: () => void;
		autofocus?: boolean;
		compact?: boolean;
		showClearButton?: boolean;
		nearCoords?: { lat: number; lon: number };
	}

	let {
		placeholder = 'Search...',
		searchType = 'location',
		category,
		limit = 10,
		onselect,
		onclear,
		autofocus = false,
		compact = false,
		showClearButton = true,
		nearCoords
	}: Props = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let inputElement: HTMLInputElement;
	let selectedIndex = $state(-1);

	// Create debounced search functions
	const debouncedLocationSearch = createDebouncedSearch(searchLocations, 300);
	const debouncedPlaceSearch = createDebouncedSearch(searchPlaces, 300);

	async function handleSearch() {
		if (!query || query.trim().length < 2) {
			results = [];
			showResults = false;
			return;
		}

		isSearching = true;
		showResults = true;
		selectedIndex = -1;

		try {
			if (searchType === 'location') {
				results = await debouncedLocationSearch(query.trim(), { limit });
			} else {
				results = await debouncedPlaceSearch(query.trim(), { 
					limit,
					category,
					near: nearCoords
				});
			}
		} catch (error) {
			console.error('Search error:', error);
			results = [];
		} finally {
			isSearching = false;
		}
	}

	function handleSelect(result: SearchResult) {
		query = result.name;
		showResults = false;
		selectedIndex = -1;
		
		if (onselect) {
			onselect(result);
		}
	}

	function handleClear() {
		query = '';
		results = [];
		showResults = false;
		selectedIndex = -1;
		
		if (onclear) {
			onclear();
		}
		
		inputElement?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showResults || results.length === 0) {
			if (e.key === 'Enter') {
				handleSearch();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < results.length) {
					handleSelect(results[selectedIndex]);
				} else if (results.length > 0) {
					handleSelect(results[0]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				showResults = false;
				selectedIndex = -1;
				break;
		}
	}

	// Watch query changes for autocomplete
	$effect(() => {
		if (query) {
			handleSearch();
		} else {
			results = [];
			showResults = false;
		}
	});

	// Format result display based on type
	function formatResultTitle(result: SearchResult): string {
		return result.name;
	}

	function formatResultSubtitle(result: SearchResult): string {
		if (searchType === 'place') {
			// For places, show address and city
			const parts = [result.type, result.city, result.state].filter(Boolean);
			return parts.join(' · ');
		} else {
			// For locations, show full display name minus the first part
			const parts = result.displayName.split(',').slice(1).map(p => p.trim());
			return parts.join(', ');
		}
	}

	// Get icon for result type
	function getResultIcon(result: SearchResult) {
		if (searchType === 'place') {
			return IconPin;
		}
		return IconLocationIcon;
	}
</script>

<div class="search-autocomplete relative w-full">
	<div class="join w-full" class:join-sm={compact}>
		<div class="relative flex-1">
			<input
				bind:this={inputElement}
				type="text"
				bind:value={query}
				{placeholder}
				class="input join-item w-full pr-8"
				class:input-sm={compact}
				class:input-bordered={true}
				{autofocus}
				onkeydown={handleKeydown}
				onfocus={() => {
					if (results.length > 0) {
						showResults = true;
					}
				}}
				aria-label={placeholder}
				aria-autocomplete="list"
				aria-expanded={showResults}
				role="combobox"
			/>
			
			{#if query && showClearButton}
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2"
					onclick={handleClear}
					aria-label="Clear search"
				>
					<IconDismiss class="size-4" />
				</button>
			{/if}
		</div>

		<button
			type="button"
			class="btn join-item btn-primary"
			class:btn-sm={compact}
			class:btn-square={compact}
			onclick={handleSearch}
			disabled={isSearching || !query.trim()}
			aria-label="Search"
		>
			{#if isSearching}
				<span class="loading loading-spinner" class:loading-xs={compact} class:loading-sm={!compact}></span>
			{:else}
				<IconSearch class="size-5" />
			{/if}
		</button>
	</div>

	<!-- Results Dropdown -->
	{#if showResults && results.length > 0}
		<div
			class="card bg-base-100 border-primary absolute top-full z-50 mt-1 w-full overflow-hidden border-2 shadow-xl"
			role="listbox"
		>
			<div class="max-h-80 overflow-y-auto">
				{#each results as result, index (result.id)}
					{@const Icon = getResultIcon(result)}
					<button
						type="button"
						class="btn btn-ghost w-full justify-start text-left transition-colors"
						class:btn-sm={compact}
						class:bg-primary={index === selectedIndex}
						class:text-primary-content={index === selectedIndex}
						onclick={() => handleSelect(result)}
						role="option"
						aria-selected={index === selectedIndex}
					>
						<Icon 
							class="flex-shrink-0 size-5"
							
						/>
						<div class="min-w-0 flex-1 overflow-hidden">
							<div 
								class="truncate font-semibold"
								class:text-xs={compact}
								class:text-sm={!compact}
							>
								{formatResultTitle(result)}
							</div>
							<div 
								class="text-base-content/60 truncate"
								class:text-[10px]={compact}
								class:text-xs={!compact}
								class:text-primary-content-80={index === selectedIndex}
							>
								{formatResultSubtitle(result)}
							</div>
						</div>
					</button>
				{/each}
			</div>

			
		</div>
	{:else if showResults && !isSearching && query.trim().length >= 2 && results.length === 0}
		<div
			class="card bg-base-100 border-warning absolute top-full z-50 mt-1 w-full border-2 shadow-xl"
		>
			<div class="card-body p-3">
				<div class="flex items-center gap-2">
					<IconSearch class="text-warning size-5" />
					<span class="text-sm">
						No {searchType === 'location' ? 'locations' : 'places'} found for "{query}"
					</span>
				</div>
				<p class="text-base-content/60 text-xs">
					Try a different search term or check your spelling.
				</p>
			</div>
		</div>
	{/if}
</div>

<!-- Click outside handler -->
{#if showResults}
	<button
		type="button"
		class="fixed inset-0 z-40"
		onclick={() => (showResults = false)}
		aria-hidden="true"
		tabindex="-1"
	></button>
{/if}

<style>
	/* Ensure dropdown is above other elements */
	.search-autocomplete {
		z-index: 50;
	}
	
	/* Smooth transitions */
	.btn {
		transition: background-color 0.2s ease, color 0.2s ease;
	}
</style>
