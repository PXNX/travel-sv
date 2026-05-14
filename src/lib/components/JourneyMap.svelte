<script lang="ts">
	import { onMount } from 'svelte';
	import type { Stop, Segment } from '$lib/types';
	import { addTileLayers } from '$lib/map';

	interface Props {
		stops: Stop[];
		segments: Segment[];
		onback?: () => void;
		onupdatestop?: (update: Partial<Stop> & { id: number }) => void;
	}

	let { stops, segments, onback, onupdatestop }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: L.Map | undefined;

	let selectedStop = $state<Stop | null>(null);
	let editStayH = $state(0);
	let editStayM = $state(0);
	let editNotes = $state('');

	const sortedStops = $derived([...stops].sort((a, b) => a.orderIndex - b.orderIndex));

	const modeColors: Record<string, string> = {
		walk: '#22c55e',
		transit: '#3b82f6',
		drive: '#f59e0b',
		walking: '#94a3b8'
	};

	// Color transit legs by product type
	const transitProductColors: Record<string, string> = {
		'S':   '#008d4f', // S-Bahn green
		'RE':  '#ec1c24', // Regional-Express red
		'RB':  '#ec1c24', // Regionalbahn red
		'ARV': '#ec1c24', // other regional red
		'MEX': '#ec1c24',
		'IRE': '#ec1c24',
		'Bus': '#a0158a', // Bus purple
		'STR': '#d6a100', // Straßenbahn / Tram gold
		'U':   '#2e5ea8', // U-Bahn dark blue
	};

	function transitColor(product?: string): string {
		if (!product) return '#3b82f6';
		return transitProductColors[product] ?? '#3b82f6';
	}

	onMount(() => {
		initMap();
		return () => { map?.remove(); };
	});

	$effect(() => {
		if (map && (stops.length || segments.length)) rebuildLayers();
	});

	async function initMap() {
		if (!mapContainer) return;
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');
		const center: [number, number] = sortedStops.length > 0 ? [sortedStops[0].lat, sortedStops[0].lon] : [50, 8];
		map = L.map(mapContainer).setView(center, 13);
		await addTileLayers(map);
		rebuildLayers();
	}

	let layerGroup: L.LayerGroup | undefined;

	async function rebuildLayers() {
		if (!map) return;
		const L = await import('leaflet');
		if (layerGroup) layerGroup.clearLayers();
		else layerGroup = L.layerGroup().addTo(map);

		const allBounds: [number, number][] = [];

		for (let i = 0; i < sortedStops.length - 1; i++) {
			const from = sortedStops[i];
			const to = sortedStops[i + 1];
			const seg = segments.find((s) => s.fromStopId === from.id && s.toStopId === to.id);
			if (!seg) continue;

			if (seg.mode === 'walk' && seg.walkGeometry?.length) {
				drawPolyline(L, seg.walkGeometry, modeColors.walk, false, allBounds);
			} else if (seg.mode === 'drive' && seg.driveGeometry?.length) {
				drawPolyline(L, seg.driveGeometry, modeColors.drive, false, allBounds);
			} else if (seg.mode === 'transit' && seg.transitGeometry?.length) {
				for (const geoLeg of seg.transitGeometry) {
					if (geoLeg.mode === 'walking') {
						drawPolyline(L, geoLeg.coords, modeColors.walking, true, allBounds);
					} else {
						const color = transitColor(geoLeg.product);
						drawPolyline(L, geoLeg.coords, color, false, allBounds);
					}
				}
				// Transfer dots at switching stations
				const transportGeo = seg.transitGeometry.filter((g) => g.mode === 'transport');
				for (let t = 0; t < transportGeo.length - 1; t++) {
					const endCoords = transportGeo[t].coords;
					const transferPt = endCoords[endCoords.length - 1];
					if (transferPt) {
						L.circleMarker(transferPt as L.LatLngExpression, {
							radius: 6, color: '#fff', fillColor: '#f97316', fillOpacity: 1, weight: 2
						}).addTo(layerGroup!);
					}
				}
			} else {
				// Fallback straight line
				const coords: [number, number][] = [[from.lat, from.lon], [to.lat, to.lon]];
				const color = modeColors[seg.mode] ?? modeColors.walk;
				drawPolyline(L, coords, color, true, allBounds);
			}
		}

		// Numbered stop markers
		sortedStops.forEach((stop, i) => {
			const icon = L.divIcon({
				html: `<div style="background:#6366f1;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">${i + 1}</div>`,
				className: '',
				iconSize: [32, 32],
				iconAnchor: [16, 16]
			});
			const marker = L.marker([stop.lat, stop.lon], { icon }).addTo(layerGroup!);
			marker.on('click', () => openStopSheet(stop));
			allBounds.push([stop.lat, stop.lon]);
		});

		if (allBounds.length >= 2) {
			map!.fitBounds(L.latLngBounds(allBounds), { padding: [50, 50] });
		}
	}

	function drawPolyline(
		L: typeof import('leaflet'),
		coords: [number, number][],
		color: string,
		dashed: boolean,
		allBounds: [number, number][]
	) {
		if (coords.length < 2) return;
		L.polyline(coords as L.LatLngExpression[], {
			color,
			weight: dashed ? 3 : 5,
			opacity: dashed ? 0.5 : 0.85,
			dashArray: dashed ? '6, 8' : undefined,
			lineCap: 'round',
			lineJoin: 'round'
		}).addTo(layerGroup!);
		for (const c of coords) allBounds.push(c);
	}

	function openStopSheet(stop: Stop) {
		selectedStop = stop;
		editStayH = Math.floor((stop.stayDurationMinutes ?? 0) / 60);
		editStayM = (stop.stayDurationMinutes ?? 0) % 60;
		editNotes = stop.notes ?? '';
	}

	function closeSheet() { selectedStop = null; }

	function saveStopChanges() {
		if (!selectedStop || !onupdatestop) return;
		onupdatestop({ id: selectedStop.id, stayDurationMinutes: editStayH * 60 + editStayM, notes: editNotes });
		closeSheet();
	}
</script>

<div class="relative h-[100dvh] w-full">
	<div class="absolute top-4 left-4 z-[1000]">
		<button class="btn btn-sm bg-base-100 shadow-md" onclick={onback}>← List</button>
	</div>

	<div bind:this={mapContainer} class="h-full w-full"></div>

	{#if selectedStop}
		<div class="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
			<div class="bg-base-100 rounded-t-2xl shadow-2xl max-w-lg mx-auto p-4">
				<div class="flex items-center justify-between mb-3">
					<h3 class="font-bold text-base">{selectedStop.name}</h3>
					<button class="btn btn-ghost btn-xs btn-circle" onclick={closeSheet}>✕</button>
				</div>
				<div class="text-xs text-base-content/50 mb-3">📍 {selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}</div>
				<div class="flex items-center gap-2 mb-3">
					<span class="text-sm font-medium w-12">Stay:</span>
					<input type="number" class="input input-bordered input-sm w-16" bind:value={editStayH} min="0" max="72" />
					<span class="text-xs">h</span>
					<input type="number" class="input input-bordered input-sm w-16" bind:value={editStayM} min="0" max="59" step="5" />
					<span class="text-xs">m</span>
				</div>
				<textarea class="textarea textarea-bordered textarea-sm w-full mb-3" placeholder="Notes…" bind:value={editNotes} rows="2"></textarea>
				{#if onupdatestop}
					<div class="flex gap-2 justify-end">
						<button class="btn btn-ghost btn-sm" onclick={closeSheet}>Cancel</button>
						<button class="btn btn-primary btn-sm" onclick={saveStopChanges}>Save</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
