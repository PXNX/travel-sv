<script lang="ts">
	import { onMount } from 'svelte';
	import type { Stop, Segment } from '$lib/types';

	interface Props {
		stops: Stop[];
		segments: Segment[];
		onmarkerclick?: (stop: Stop) => void;
		onback?: () => void;
	}

	let { stops, segments, onmarkerclick, onback }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: L.Map | undefined;

	const sortedStops = $derived([...stops].sort((a, b) => a.orderIndex - b.orderIndex));

	onMount(() => {
		initMap();
		return () => {
			map?.remove();
		};
	});

	async function initMap() {
		if (!mapContainer) return;
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		const center: [number, number] =
			sortedStops.length > 0 ? [sortedStops[0].lat, sortedStops[0].lon] : [50, 8];

		map = L.map(mapContainer).setView(center, 13);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		// T47 — Numbered clickable markers
		sortedStops.forEach((stop, i) => {
			if (!map) return;

			const icon = L.divIcon({
				html: `<div style="background:#6366f1;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${i + 1}</div>`,
				className: '',
				iconSize: [28, 28],
				iconAnchor: [14, 14]
			});

			const marker = L.marker([stop.lat, stop.lon], { icon }).addTo(map);

			marker.on('click', () => onmarkerclick?.(stop));

			// T48 — Popup with stop info
			const stayInfo = stop.stayDurationMinutes ? `<br>Stay: ${stop.stayDurationMinutes} min` : '';
			const notesInfo = stop.notes ? `<br><em>${stop.notes}</em>` : '';
			marker.bindPopup(`<strong>${stop.name}</strong>${stayInfo}${notesInfo}`);
		});

		// T47 — Route polyline
		if (sortedStops.length > 1) {
			const coords: [number, number][] = sortedStops.map((s) => [s.lat, s.lon]);
			L.polyline(coords, {
				color: '#6366f1',
				weight: 3,
				opacity: 0.7,
				dashArray: '8, 8'
			}).addTo(map);

			// Fit bounds
			map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
		}
	}
</script>

<!-- T46 — Full-screen map mode -->
<div class="relative h-[100dvh] w-full">
	<!-- T49 — Back to list button -->
	<div class="absolute top-4 left-4 z-[1000]">
		<button class="btn btn-sm bg-base-100 shadow-md" onclick={onback}>← List</button>
	</div>

	<div bind:this={mapContainer} class="h-full w-full"></div>
</div>
