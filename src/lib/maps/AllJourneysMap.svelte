<script lang="ts">
	// A quiet overview of every planned route. Planning stays on the home page;
	// this is just the "see them all at once" tab.
	import { Map, TileLayer, Polyline, CircleMarker } from 'sveaflet';
	import { browser } from '$app/environment';
	import type { JourneyWithDerived } from '$lib/types';

	interface Props {
		journeys: JourneyWithDerived[];
		onopen?: (id: number) => void;
	}

	let { journeys, onopen }: Props = $props();
	let mapInstance: L.Map | undefined = $state();
	let activeId = $state<number | null>(null);

	const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

	const LINES = ['#1b2b3a', '#a24e2c', '#2e5ea8', '#2f7d58', '#b23b2e', '#c98a1f'];

	const routes = $derived(
		journeys
			.filter((j) => (j.stopCoords?.length ?? 0) > 0)
			.map((j, i) => ({ journey: j, color: LINES[i % LINES.length] }))
	);

	const bounds = $derived.by((): [[number, number], [number, number]] | null => {
		const coords = routes.flatMap((r) => r.journey.stopCoords!);
		if (coords.length === 0) return null;
		const lats = coords.map((c) => c.lat);
		const lons = coords.map((c) => c.lon);
		return [
			[Math.min(...lats), Math.min(...lons)],
			[Math.max(...lats), Math.max(...lons)]
		];
	});

	const mapOptions = $derived({
		center: bounds
			? ([(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2] as [number, number])
			: ([50.9, 10.3] as [number, number]),
		zoom: 6,
		minZoom: 2,
		maxZoom: 19,
		zoomControl: true,
		attributionControl: false
	});

	$effect(() => {
		if (!browser || !mapInstance || !bounds) return;
		mapInstance.fitBounds(bounds, { padding: [40, 40] });
	});
</script>

{#if browser && routes.length > 0}
	<div class="h-[60vh] min-h-80 w-full">
		<Map options={mapOptions} bind:instance={mapInstance}>
			<TileLayer url={tileUrl} options={{ maxZoom: 19 }} />

			{#each routes as route (route.journey.id)}
				{@const coords = route.journey.stopCoords!.map((c) => [c.lat, c.lon] as [number, number])}
				{#if coords.length > 1}
					<Polyline
						latLngs={coords}
						options={{
							color: route.color,
							weight: activeId === route.journey.id ? 6 : 4,
							opacity: activeId === route.journey.id ? 1 : 0.75,
							lineCap: 'round',
							lineJoin: 'round'
						}}
					/>
				{/if}
				{#each route.journey.stopCoords!.slice(0, 1) as stop (stop.lat + ':' + stop.lon)}
					<CircleMarker
						latLng={[stop.lat, stop.lon]}
						options={{
							radius: 7,
							color: '#fffdf7',
							fillColor: route.color,
							fillOpacity: 1,
							weight: 2
						}}
						onclick={() => {
							activeId = route.journey.id;
							onopen?.(route.journey.id);
						}}
					/>
				{/each}
			{/each}
		</Map>
	</div>
{:else if browser}
	<div
		class="flex h-64 items-center justify-center border border-dashed border-[#1b2b3a]/25 bg-[#fffdf7]/60 text-sm text-[#1b2b3a]/50"
	>
		No routes to show yet — plan a journey first.
	</div>
{/if}
