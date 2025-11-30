<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	onMount(() => {
		const url = $page.url.searchParams.get('url');
		const title = $page.url.searchParams.get('title');
		const text = $page.url.searchParams.get('text');

		// Parse Google Maps URL to extract coordinates
		if (url) {
			const coords = extractGoogleMapsCoords(url);
			if (coords) {
				// Redirect to new location page with coordinates
				goto(resolve(`/location/new?lat=${coords.lat.toFixed(6)}&lng=${coords.lng.toFixed(6)}`));
				return;
			}
		}

		// If no valid coordinates, go to home
		goto('/');
	});

	function extractGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
		try {
			// Handle google.com/maps URLs with @lat,lng
			const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
			if (atMatch) {
				return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
			}

			// Handle maps.app.goo.gl short URLs (would need to fetch and parse)
			// Handle other Google Maps URL formats

			return null;
		} catch {
			return null;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="loading loading-spinner loading-lg"></div>
	<p class="ml-4">Processing shared location...</p>
</div>
