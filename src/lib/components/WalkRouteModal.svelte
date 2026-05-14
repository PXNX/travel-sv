<script lang="ts">
	import type { Segment } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import { addTileLayers } from '$lib/map';

	interface Props {
		open: boolean;
		segment: Segment | null;
		fromName?: string;
		toName?: string;
		onclose?: () => void;
	}

	let { open = $bindable(false), segment, fromName = 'Start', toName = 'End', onclose }: Props = $props();

	let mapEl: HTMLDivElement | undefined = $state();
	let leafletMap: L.Map | undefined;

	const isWalk = $derived(segment?.mode === 'walk');
	const isDrive = $derived(segment?.mode === 'drive');

	const geometry = $derived(
		isWalk ? segment?.walkGeometry : isDrive ? segment?.driveGeometry : null
	);

	const lineColor = $derived(isWalk ? '#22c55e' : '#3b82f6');
	const modeLabel = $derived(isWalk ? 'Walking Route' : 'Driving Route');
	const modeIcon = $derived(isWalk ? '🚶' : '🚗');

	function close() { open = false; onclose?.(); }

	$effect(() => {
		if (open && geometry?.length && mapEl) {
			setTimeout(() => initMap(), 50);
		}
		if (!open && leafletMap) {
			leafletMap.remove();
			leafletMap = undefined;
		}
	});

	async function initMap() {
		if (!mapEl || leafletMap) return;
		const coords = geometry;
		if (!coords || coords.length < 2) return;

		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		leafletMap = L.map(mapEl, { zoomControl: true, attributionControl: false });
		await addTileLayers(leafletMap);

		const line = L.polyline(coords as L.LatLngExpression[], {
			color: lineColor,
			weight: 5,
			opacity: 0.85,
			lineCap: 'round',
			lineJoin: 'round'
		}).addTo(leafletMap);

		// start
		L.circleMarker(coords[0] as L.LatLngExpression, {
			radius: 8, color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2
		}).addTo(leafletMap).bindTooltip(fromName, { permanent: false });

		// end
		L.circleMarker(coords[coords.length - 1] as L.LatLngExpression, {
			radius: 8, color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2
		}).addTo(leafletMap).bindTooltip(toName, { permanent: false });

		leafletMap.fitBounds(line.getBounds(), { padding: [40, 40] });
	}
</script>

{#if open && segment && geometry?.length}
	<div class="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/50" onclick={close}>
		<div
			class="bg-base-100 w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh] animate-slide-up"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-base-300 px-5 py-3">
				<div>
					<h3 class="font-bold text-base flex items-center gap-1.5">
						<span>{modeIcon}</span> {modeLabel}
					</h3>
					<p class="text-xs text-base-content/50">
						{formatDistance(segment.distanceM ?? 0)} ·
						~{formatDuration(segment.travelDurationMinutes ?? 0)}
						{#if isWalk && (segment.elevationUpM || segment.elevationDownM)}
							· ↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m
						{/if}
					</p>
				</div>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={close}>✕</button>
			</div>

			<div class="flex-1 min-h-0">
				<div bind:this={mapEl} class="w-full h-[55dvh] sm:h-96"></div>
			</div>

			<div class="border-t border-base-300 px-5 py-3 flex items-center justify-between text-xs text-base-content/50">
				<span>{fromName} → {toName}</span>
				<button class="btn btn-ghost btn-xs" onclick={close}>Close</button>
			</div>
		</div>
	</div>
{/if}
