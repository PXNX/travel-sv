<script lang="ts">
	import { Map, TileLayer, Polyline, CircleMarker } from 'sveaflet';
	import type { Map as LeafletMap } from 'leaflet';
	import { browser } from '$app/environment';

	interface Props {
		coords: { lat: number; lon: number }[];
		class?: string;
	}

	let { coords, class: className = '' }: Props = $props();

	let mapInstance: LeafletMap | undefined = $state();

	const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

	const points: [number, number][] = $derived(coords.map((c) => [c.lat, c.lon]));
	const first = $derived(points[0]);
	const last = $derived(points[points.length - 1]);

	const mapOptions = $derived.by(() => {
		const opts: Record<string, unknown> = {
			zoomControl: false,
			attributionControl: false,
			dragging: false,
			scrollWheelZoom: false,
			doubleClickZoom: false,
			boxZoom: false,
			keyboard: false,
			touchZoom: false
		};

		if (points.length === 1) {
			opts.center = first;
			opts.zoom = 13;
		}

		return opts;
	});

	$effect(() => {
		if (!browser || !mapInstance || points.length < 2) return;
		const map = mapInstance;
		const pts = points;
		import('leaflet').then(({ latLngBounds }) => {
			map.fitBounds(latLngBounds(pts), { padding: [10, 10] });
		});
	});
</script>

{#if browser && coords.length > 0}
	<div class={className}>
		<Map options={mapOptions} bind:instance={mapInstance}>
			<TileLayer url={tileUrl} options={{ maxZoom: 19 }} />

			{#if points.length >= 2}
				<Polyline
					latLngs={points}
					options={{
						color: '#6366f1',
						weight: 3,
						opacity: 0.8,
						lineCap: 'round',
						lineJoin: 'round'
					}}
				/>
			{/if}

			{#if first}
				<CircleMarker
					latLng={first}
					options={{
						radius: 4,
						color: '#fff',
						fillColor: '#22c55e',
						fillOpacity: 1,
						weight: 2
					}}
				/>
			{/if}

			{#if points.length > 1 && last}
				<CircleMarker
					latLng={last}
					options={{
						radius: 4,
						color: '#fff',
						fillColor: '#ef4444',
						fillOpacity: 1,
						weight: 2
					}}
				/>
			{/if}
		</Map>
	</div>
{/if}
