<script lang="ts">
	import { Map, TileLayer, Polyline, CircleMarker, Tooltip } from 'sveaflet';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import type { Segment } from '$lib/types';
	import { formatDistance, formatDuration } from '$lib/helpers';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconCar from '~icons/material-symbols/directions-car-outline-rounded';
	import IconNavigation from '~icons/material-symbols/navigation-rounded';
	import IconRadar from '~icons/material-symbols/track-changes-rounded';
	import { Button, IconButton, Modal } from '$lib/components/ui';

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
			const d = haversineDistance(
				currentPosition.lat,
				currentPosition.lon,
				coords[i][0],
				coords[i][1]
			);
			if (d < minDist) {
				minDist = d;
				nearestIdx = i;
			}
		}
		let remaining = 0;
		for (let i = nearestIdx; i < coords.length - 1; i++) {
			remaining += haversineDistance(
				coords[i][0],
				coords[i][1],
				coords[i + 1][0],
				coords[i + 1][1]
			);
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
</script>

{#if browser && segment && geometry?.length}
	<Modal
		bind:open
		title={modeLabel}
		icon={isWalk ? IconWalk : IconCar}
		layer="raised"
		padded={false}
		{onclose}
	>
		{#snippet subtitle()}
			{formatDistance(segment.distanceM ?? 0)} · ~{formatDuration(
				segment.travelDurationMinutes ?? 0
			)}
			{#if isWalk && (segment.elevationUpM || segment.elevationDownM)}
				· ↑{Math.round(segment.elevationUpM ?? 0)}m ↓{Math.round(segment.elevationDownM ?? 0)}m
			{/if}
		{/snippet}

		<div class="h-[55dvh] w-full sm:h-96">
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

		{#snippet footer()}
			<div class="flex items-center justify-between gap-2">
				{#if isTracking && remainingDistance != null && eta}
					<div class="min-w-0">
						<p class="text-sm font-semibold">{formatDistance(remainingDistance)} remaining</p>
						<p class="text-base-content/50 text-xs">ETA {fmtTime(eta)}</p>
					</div>
				{:else}
					<span class="text-base-content/50 truncate text-xs">{fromName} → {toName}</span>
				{/if}
				<div class="flex shrink-0 items-center gap-1.5">
					<IconButton
						icon={IconRadar}
						label="Focus destination"
						size="xs"
						onclick={focusDestination}
					/>
					{#if isTracking}
						<Button variant="error" size="xs" onclick={stopTracking}>Stop</Button>
					{:else}
						<Button size="xs" icon={IconNavigation} onclick={startTracking}>Navigate</Button>
					{/if}
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}
