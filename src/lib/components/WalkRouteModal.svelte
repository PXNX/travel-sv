<script lang="ts">
	import { Map, TileLayer, Polyline, CircleMarker, Tooltip } from 'sveaflet';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import type { Segment } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconCar from '~icons/material-symbols/directions-car-outline-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconNavigation from '~icons/material-symbols/navigation-rounded';
	import IconRadar from '~icons/material-symbols/track-changes-rounded';

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

	let mapInstance: L.Map | undefined = $state();
	let isTracking = $state(false);
	let currentPosition = $state<{ lat: number; lon: number } | null>(null);
	let watchId: number | null = null;

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

	function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371000;
		const toRad = (d: number) => (d * Math.PI) / 180;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	const remainingDistance = $derived.by(() => {
		if (!currentPosition || coords.length < 2) return null;
		let minDist = Infinity;
		let nearestIdx = 0;
		for (let i = 0; i < coords.length; i++) {
			const d = haversineDistance(currentPosition.lat, currentPosition.lon, coords[i][0], coords[i][1]);
			if (d < minDist) {
				minDist = d;
				nearestIdx = i;
			}
		}
		let remaining = 0;
		for (let i = nearestIdx; i < coords.length - 1; i++) {
			remaining += haversineDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
		}
		return Math.round(remaining);
	});

	const eta = $derived.by(() => {
		if (remainingDistance == null) return null;
		const speedMPerMin = isWalk ? 83.3 : 666.7;
		const etaMinutes = remainingDistance / speedMPerMin;
		return new Date(Date.now() + etaMinutes * 60000);
	});

	function fmtTime(date: Date): string {
		return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}

	function startTracking() {
		if (!browser || !navigator.geolocation) return;
		isTracking = true;
		watchId = navigator.geolocation.watchPosition(
			(pos) => {
				currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
			},
			() => {},
			{ enableHighAccuracy: true, maximumAge: 5000 }
		);
	}

	function stopTracking() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		isTracking = false;
		currentPosition = null;
	}

	function focusDestination() {
		if (!mapInstance || !last) return;
		mapInstance.setView(last, 16, { animate: true });
	}

	function toBounds(pts: [number, number][]): [[number, number], [number, number]] {
		let minLat = Infinity,
			maxLat = -Infinity,
			minLng = Infinity,
			maxLng = -Infinity;
		for (const [lat, lng] of pts) {
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
		}
		return [
			[minLat, minLng],
			[maxLat, maxLng]
		];
	}

	$effect(() => {
		if (!browser || !mapInstance || coords.length < 2) return;
		mapInstance.fitBounds(toBounds(coords), { padding: [40, 40] });
	});

	$effect(() => {
		if (!open) stopTracking();
	});

	onDestroy(() => {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
		}
	});

	function close() {
		stopTracking();
		open = false;
		onclose?.();
	}
</script>

{#if browser && open && segment && geometry?.length}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/50"
		role="dialog" aria-modal="true" aria-label="Route details" tabindex="-1"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-base-100 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh] animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
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

						{#if currentPosition}
							<CircleMarker
								latLng={[currentPosition.lat, currentPosition.lon]}
								options={{
									radius: 9,
									color: '#3b82f6',
									fillColor: '#3b82f6',
									fillOpacity: 0.35,
									weight: 3
								}}
							>
								<Tooltip>You</Tooltip>
							</CircleMarker>
						{/if}
					</Map>
				</div>
			</div>

			<div class="border-t border-base-300 px-5 py-3 flex items-center justify-between gap-2">
				{#if isTracking && remainingDistance != null && eta}
					<div class="min-w-0">
						<p class="text-sm font-semibold">{formatDistance(remainingDistance)} remaining</p>
						<p class="text-xs text-base-content/50">ETA {fmtTime(eta)}</p>
					</div>
				{:else}
					<span class="text-xs text-base-content/50 truncate">{fromName} → {toName}</span>
				{/if}
				<div class="flex items-center gap-1.5 shrink-0">
					<button
						class="btn btn-ghost btn-xs btn-circle"
						onclick={focusDestination}
						title="Focus destination"
					>
						<IconRadar class="h-4 w-4" />
					</button>
					{#if isTracking}
						<button class="btn btn-error btn-xs gap-1" onclick={stopTracking}>
							Stop
						</button>
					{:else}
						<button class="btn btn-primary btn-xs gap-1" onclick={startTracking}>
							<IconNavigation class="h-3.5 w-3.5" />
							Navigate
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
