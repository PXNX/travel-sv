<script lang="ts">
	import { Map, TileLayer, ControlLayers, Polyline, CircleMarker, Marker, DivIcon } from 'sveaflet';
	import type { Map as LeafletMap } from 'leaflet';
	import { browser } from '$app/environment';
	import type { Stop, Segment } from '$lib/types';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';

	interface Props {
		stops: Stop[];
		segments: Segment[];
		onback?: () => void;
		onupdatestop?: (update: Partial<Stop> & { id: number }) => void;
	}

	let { stops, segments, onback, onupdatestop }: Props = $props();

	let mapInstance: LeafletMap | undefined = $state();
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

	const transitProductColors: Record<string, string> = {
		S: '#008d4f',
		RE: '#ec1c24',
		RB: '#ec1c24',
		ARV: '#ec1c24',
		MEX: '#ec1c24',
		IRE: '#ec1c24',
		Bus: '#a0158a',
		STR: '#d6a100',
		U: '#2e5ea8'
	};

	function transitColor(product?: string): string {
		if (!product) return '#3b82f6';
		return transitProductColors[product] ?? '#3b82f6';
	}

	interface PolylineData {
		coords: [number, number][];
		color: string;
		weight: number;
		opacity: number;
		dashArray?: string;
	}

	const renderData = $derived.by(() => {
		const polylines: PolylineData[] = [];
		const transferMarkers: [number, number][] = [];
		const allBounds: [number, number][] = [];

		for (let i = 0; i < sortedStops.length - 1; i++) {
			const from = sortedStops[i];
			const to = sortedStops[i + 1];
			const seg = segments.find((s) => s.fromStopId === from.id && s.toStopId === to.id);
			if (!seg) continue;

			if (seg.mode === 'walk' && seg.walkGeometry?.length) {
				pushPolyline(polylines, seg.walkGeometry, modeColors.walk, false, allBounds);
			} else if (seg.mode === 'drive' && seg.driveGeometry?.length) {
				pushPolyline(polylines, seg.driveGeometry, modeColors.drive, false, allBounds);
			} else if (seg.mode === 'transit' && seg.transitGeometry?.length) {
				for (const geoLeg of seg.transitGeometry) {
					if (geoLeg.mode === 'walking') {
						pushPolyline(polylines, geoLeg.coords, modeColors.walking, true, allBounds);
					} else {
						pushPolyline(polylines, geoLeg.coords, transitColor(geoLeg.product), false, allBounds);
					}
				}
				const transportGeo = seg.transitGeometry.filter((g) => g.mode === 'transport');
				for (let t = 0; t < transportGeo.length - 1; t++) {
					const endCoords = transportGeo[t].coords;
					const pt = endCoords[endCoords.length - 1];
					if (pt) transferMarkers.push(pt);
				}
			} else {
				const coords: [number, number][] = [
					[from.lat, from.lon],
					[to.lat, to.lon]
				];
				pushPolyline(polylines, coords, modeColors[seg.mode] ?? modeColors.walk, true, allBounds);
			}
		}

		for (const stop of sortedStops) {
			allBounds.push([stop.lat, stop.lon]);
		}

		return { polylines, transferMarkers, allBounds };
	});

	function pushPolyline(
		polylines: PolylineData[],
		coords: [number, number][],
		color: string,
		dashed: boolean,
		allBounds: [number, number][]
	) {
		if (coords.length < 2) return;
		polylines.push({
			coords,
			color,
			weight: dashed ? 3 : 5,
			opacity: dashed ? 0.5 : 0.85,
			dashArray: dashed ? '6, 8' : undefined
		});
		for (const c of coords) allBounds.push(c);
	}

	const center = $derived.by((): [number, number] => {
		if (sortedStops.length > 0) return [sortedStops[0].lat, sortedStops[0].lon];
		return [50, 8];
	});

	const mapOptions = $derived({
		center,
		zoom: 13,
		minZoom: 1,
		maxZoom: 19,
		zoomControl: true
	});

	$effect(() => {
		if (!browser || !mapInstance || renderData.allBounds.length < 2) return;
		const map = mapInstance;
		const bounds = renderData.allBounds;
		import('leaflet').then(({ latLngBounds }) => {
			map.fitBounds(latLngBounds(bounds), { padding: [50, 50] });
		});
	});

	function openStopSheet(stop: Stop) {
		selectedStop = stop;
		editStayH = Math.floor((stop.stayDurationMinutes ?? 0) / 60);
		editStayM = (stop.stayDurationMinutes ?? 0) % 60;
		editNotes = stop.notes ?? '';
	}

	function closeSheet() {
		selectedStop = null;
	}

	function saveStopChanges() {
		if (!selectedStop || !onupdatestop) return;
		onupdatestop({
			id: selectedStop.id,
			stayDurationMinutes: editStayH * 60 + editStayM,
			notes: editNotes
		});
		closeSheet();
	}
</script>

{#if browser}
<div class="relative h-[100dvh] w-full">
	<div class="absolute top-4 left-4 z-[1000]">
		<button class="btn btn-sm bg-base-100 shadow-md gap-1" onclick={onback}>
			<IconArrowBack class="h-4 w-4" />
			List
		</button>
	</div>

	<div class="h-full w-full">
		<Map options={mapOptions} bind:instance={mapInstance}>
			<ControlLayers options={{ position: 'topright', collapsed: true }}>
				<TileLayer
					url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
					name="Map"
					layerType="base"
					checked
					options={{ attribution: '&copy; OSM', maxZoom: 19 }}
				/>
				<TileLayer
					url={'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'}
					name="Satellite"
					layerType="base"
					options={{ attribution: '&copy; Esri', maxZoom: 19 }}
				/>
			</ControlLayers>

			{#each renderData.polylines as poly, idx (idx)}
				<Polyline
					latLngs={poly.coords}
					options={{
						color: poly.color,
						weight: poly.weight,
						opacity: poly.opacity,
						dashArray: poly.dashArray,
						lineCap: 'round',
						lineJoin: 'round'
					}}
				/>
			{/each}

			{#each renderData.transferMarkers as pt, idx (idx)}
				<CircleMarker
					latLng={pt}
					options={{
						radius: 6,
						color: '#fff',
						fillColor: '#f97316',
						fillOpacity: 1,
						weight: 2
					}}
				/>
			{/each}

			{#each sortedStops as stop, i (stop.id)}
				<Marker latLng={[stop.lat, stop.lon]} onclick={() => openStopSheet(stop)}>
					<DivIcon options={{ className: '', iconSize: [32, 32], iconAnchor: [16, 16] }}>
						<div
							style="background:#6366f1;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"
						>
							{i + 1}
						</div>
					</DivIcon>
				</Marker>
			{/each}
		</Map>
	</div>

	{#if selectedStop}
		<div class="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
			<div class="bg-base-100 rounded-t-2xl shadow-2xl max-w-lg mx-auto p-4">
				<div class="flex items-center justify-between mb-3">
					<h3 class="font-bold text-base">{selectedStop.name}</h3>
					<button class="btn btn-ghost btn-xs btn-circle" onclick={closeSheet}>
						<IconClose class="h-4 w-4" />
					</button>
				</div>
				<div class="flex items-center gap-1 text-xs text-base-content/50 mb-3">
					<IconPin class="h-3.5 w-3.5" />
					{selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}
				</div>
				<div class="flex items-center gap-2 mb-3">
					<span class="text-sm font-medium w-12">Stay:</span>
					<input
						type="number"
						class="input input-bordered input-sm w-16"
						bind:value={editStayH}
						min="0"
						max="72"
					/>
					<span class="text-xs">h</span>
					<input
						type="number"
						class="input input-bordered input-sm w-16"
						bind:value={editStayM}
						min="0"
						max="59"
						step="5"
					/>
					<span class="text-xs">m</span>
				</div>
				<textarea
					class="textarea textarea-bordered textarea-sm w-full mb-3"
					placeholder="Notes…"
					bind:value={editNotes}
					rows="2"
				></textarea>
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
	{/if}
