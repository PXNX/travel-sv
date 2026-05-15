<script lang="ts">
	import { Map, TileLayer, Polyline, CircleMarker, Tooltip } from 'sveaflet';
	import type { Map as LeafletMap } from 'leaflet';
	import { browser } from '$app/environment';
	import type { Segment } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconCar from '~icons/material-symbols/directions-car-outline-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';

	interface Props {
		open: boolean;
		segment: Segment | null;
		fromName?: string;
		toName?: string;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		segment,
		fromName = 'Start',
		toName = 'End',
		onclose
	}: Props = $props();

	let mapInstance: LeafletMap | undefined = $state();

	const isWalk = $derived(segment?.mode === 'walk');
	const isDrive = $derived(segment?.mode === 'drive');

	const geometry = $derived(
		isWalk ? segment?.walkGeometry : isDrive ? segment?.driveGeometry : null
	);

	const lineColor = $derived(isWalk ? '#22c55e' : '#3b82f6');
	const modeLabel = $derived(isWalk ? 'Walking Route' : 'Driving Route');

	const coords = $derived((geometry ?? []) as [number, number][]);
	const first = $derived(coords[0]);
	const last = $derived(coords[coords.length - 1]);

	const mapOptions = $derived({
		center: (first ?? [50, 8]) as [number, number],
		zoom: 13,
		zoomControl: true,
		attributionControl: false
	});

	$effect(() => {
		if (!browser || !mapInstance || coords.length < 2) return;
		const map = mapInstance;
		const c = coords;
		import('leaflet').then(({ latLngBounds }) => {
			map.fitBounds(latLngBounds(c), { padding: [40, 40] });
		});
	});

	function close() {
		open = false;
		onclose?.();
	}
</script>

{#if browser && open && segment && geometry?.length}
	<div
		class="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/50"
		onclick={close}
	>
		<div
			class="bg-base-100 w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh] animate-slide-up"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-base-300 px-5 py-3">
				<div>
					<h3 class="font-bold text-base flex items-center gap-1.5">
						{#if isWalk}
							<IconWalk class="h-5 w-5" />
						{:else}
							<IconCar class="h-5 w-5" />
						{/if}
						{modeLabel}
					</h3>
					<p class="text-xs text-base-content/50">
						{formatDistance(segment.distanceM ?? 0)} ·
						~{formatDuration(segment.travelDurationMinutes ?? 0)}
						{#if isWalk && (segment.elevationUpM || segment.elevationDownM)}
							· ↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(
								segment.elevationDownM ?? 0
							)}m
						{/if}
					</p>
				</div>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={close}>
					<IconClose class="h-5 w-5" />
				</button>
			</div>

			<div class="flex-1 min-h-0">
				<div class="w-full h-[55dvh] sm:h-96">
					<Map options={mapOptions} bind:instance={mapInstance}>
						<TileLayer
							url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
							options={{ maxZoom: 19 }}
						/>

						{#if coords.length >= 2}
							<Polyline
								latLngs={coords}
								options={{
									color: lineColor,
									weight: 5,
									opacity: 0.85,
									lineCap: 'round',
									lineJoin: 'round'
								}}
							/>
						{/if}

						{#if first}
							<CircleMarker
								latLng={first}
								options={{
									radius: 8,
									color: '#fff',
									fillColor: '#22c55e',
									fillOpacity: 1,
									weight: 2
								}}
							>
								<Tooltip>{fromName}</Tooltip>
							</CircleMarker>
						{/if}

						{#if last}
							<CircleMarker
								latLng={last}
								options={{
									radius: 8,
									color: '#fff',
									fillColor: '#ef4444',
									fillOpacity: 1,
									weight: 2
								}}
							>
								<Tooltip>{toName}</Tooltip>
							</CircleMarker>
						{/if}
					</Map>
				</div>
			</div>

			<div
				class="border-t border-base-300 px-5 py-3 flex items-center justify-between text-xs text-base-content/50"
			>
				<span>{fromName} → {toName}</span>
				<button class="btn btn-ghost btn-xs" onclick={close}>Close</button>
			</div>
		</div>
	</div>
{/if}
