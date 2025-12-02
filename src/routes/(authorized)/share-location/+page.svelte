<!-- src/routes/share-location/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import IconMap from '~icons/fluent/map-24-regular';
	import { page } from '$app/state';

	let status = $state('Processing shared location...');
	let error = $state('');

	onMount(() => {
		processSharedContent();
	});

	function processSharedContent() {
		const url = page.url.searchParams.get('url');
		const title = page.url.searchParams.get('title');
		const text = page.url.searchParams.get('text');

		console.log('Shared content:', { url, title, text });

		// Try to extract coordinates from URL
		if (url) {
			const coords = extractGoogleMapsCoords(url);
			if (coords) {
				const titleParam = title || text || '';
				goto(
					`/location/new?lat=${coords.lat}&lng=${coords.lng}${titleParam ? `&title=${encodeURIComponent(titleParam)}` : ''}`
				);
				return;
			}
		}

		// Try to extract from text if URL parsing failed
		if (text) {
			const coords = extractGoogleMapsCoords(text);
			if (coords) {
				goto(`/location/new?lat=${coords.lat}&lng=${coords.lng}`);
				return;
			}
		}

		// No valid coordinates found
		error = 'Could not extract location from shared content';
		setTimeout(() => goto('/'), 3000);
	}

	function extractGoogleMapsCoords(input: string): { lat: number; lng: number } | null {
		try {
			// Pattern 1: @lat,lng,zoom (e.g., @40.7128,-74.0060,15z)
			const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
			const atMatch = input.match(atPattern);
			if (atMatch) {
				return {
					lat: parseFloat(atMatch[1]),
					lng: parseFloat(atMatch[2])
				};
			}

			// Pattern 2: /maps/place/.../@lat,lng
			const placePattern = /maps\/place\/[^\/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
			const placeMatch = input.match(placePattern);
			if (placeMatch) {
				return {
					lat: parseFloat(placeMatch[1]),
					lng: parseFloat(placeMatch[2])
				};
			}

			// Pattern 3: ?q=lat,lng
			const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
			const qMatch = input.match(qPattern);
			if (qMatch) {
				return {
					lat: parseFloat(qMatch[1]),
					lng: parseFloat(qMatch[2])
				};
			}

			// Pattern 4: ll=lat,lng
			const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
			const llMatch = input.match(llPattern);
			if (llMatch) {
				return {
					lat: parseFloat(llMatch[1]),
					lng: parseFloat(llMatch[2])
				};
			}

			return null;
		} catch (err) {
			console.error('Error parsing coordinates:', err);
			return null;
		}
	}
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center">
	<div class="card bg-base-100 w-96 shadow-xl">
		<div class="card-body items-center text-center">
			{#if error}
				<div class="alert alert-error">
					<span>{error}</span>
				</div>
				<p class="text-sm">Redirecting to home...</p>
			{:else}
				<IconMap class="text-primary size-16 animate-pulse" />
				<h2 class="card-title">{status}</h2>
				<progress class="progress progress-primary w-full"></progress>
			{/if}
		</div>
	</div>
</div>
