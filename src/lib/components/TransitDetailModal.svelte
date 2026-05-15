<script lang="ts">
	import { Map, TileLayer, Polyline, CircleMarker } from 'sveaflet';
	import type { Map as LeafletMap } from 'leaflet';
	import { browser } from '$app/environment';
	import type { Segment, TransitLeg } from '$lib/types';
	import { formatDuration, formatDistance } from '$lib/helpers';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconTimer from '~icons/material-symbols/timer-outline-rounded';

	interface Props {
		open: boolean;
		segment: Segment | null;
		onclose?: () => void;
	}

	let { open = $bindable(false), segment, onclose }: Props = $props();

	let transitMapInstance: LeafletMap | undefined = $state();

	const legs = $derived((segment?.transitLegs ?? []) as TransitLeg[]);
	const transfers = $derived(segment?.transfers ?? 0);
	const walkTo = $derived(segment?.walkToStationMin ?? 0);
	const walkFrom = $derived(segment?.walkFromStationMin ?? 0);

	const visibleLegs = $derived(
		legs.filter((leg) => {
			if (leg.type === 'walking' && leg.durationMinutes <= 0) return false;
			return true;
		})
	);

	const transitProductColors: Record<string, string> = {
		S: '#008d4f',
		RE: '#ec1c24',
		RB: '#ec1c24',
		Bus: '#a0158a',
		STR: '#d6a100',
		U: '#2e5ea8'
	};

	function productColor(product?: string): string {
		if (!product) return '#3b82f6';
		return transitProductColors[product] ?? '#3b82f6';
	}

	interface TransitPolylineData {
		coords: [number, number][];
		color: string;
		dashed: boolean;
	}

	const mapRenderData = $derived.by(() => {
		const polylines: TransitPolylineData[] = [];
		const allBounds: [number, number][] = [];
		const transferPts: [number, number][] = [];
		const geo = segment?.transitGeometry;
		if (!geo?.length) return { polylines, allBounds, transferPts, hasData: false };

		for (const geoLeg of geo) {
			if (geoLeg.coords.length < 2) continue;
			const dashed = geoLeg.mode === 'walking';
			const color = dashed ? '#94a3b8' : productColor(geoLeg.product);
			polylines.push({ coords: geoLeg.coords, color, dashed });
			for (const c of geoLeg.coords) allBounds.push(c);
		}

		const transportGeo = geo.filter((g) => g.mode === 'transport');
		for (let t = 0; t < transportGeo.length - 1; t++) {
			const endCoords = transportGeo[t].coords;
			const pt = endCoords[endCoords.length - 1];
			if (pt) transferPts.push(pt);
		}

		return { polylines, allBounds, transferPts, hasData: allBounds.length >= 2 };
	});

	const firstPt = $derived(mapRenderData.allBounds[0]);
	const lastPt = $derived(mapRenderData.allBounds[mapRenderData.allBounds.length - 1]);

	const transitMapOptions = $derived({
		center: (firstPt ?? [50, 8]) as [number, number],
		zoom: 13,
		zoomControl: false,
		attributionControl: false,
		dragging: true,
		scrollWheelZoom: false
	});

	$effect(() => {
		if (!browser || !transitMapInstance || !mapRenderData.hasData) return;
		const map = transitMapInstance;
		const bounds = mapRenderData.allBounds;
		import('leaflet').then(({ latLngBounds }) => {
			map.fitBounds(latLngBounds(bounds), { padding: [20, 20] });
		});
	});

	function lineLabel(leg: TransitLeg): string {
		const p = leg.product ?? '';
		const n = leg.lineName ?? '';
		if (n && p && n.toLowerCase().startsWith(p.toLowerCase())) return n;
		if (p && n) return `${p}${n}`;
		return n || p || 'Öffi';
	}

	function walkLabel(leg: TransitLeg): string {
		if (leg.distanceM && leg.distanceM > 0) return formatDistance(leg.distanceM);
		if (leg.durationMinutes > 0) return `~${formatDuration(leg.durationMinutes)}`;
		return '';
	}

	function fmtTime(iso?: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}

	function waitBefore(index: number): number {
		if (index <= 0) return 0;
		const prev = visibleLegs[index - 1];
		const curr = visibleLegs[index];
		if (!prev?.arrival || !curr?.departure) return 0;
		const diff =
			(new Date(curr.departure).getTime() - new Date(prev.arrival).getTime()) / 60000;
		return Math.max(0, Math.round(diff));
	}

	function close() {
		open = false;
		onclose?.();
	}
</script>

{#if browser && open && segment}
	<div
		class="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-black/50"
		onclick={close}
	>
		<div
			class="bg-base-100 w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85dvh] animate-slide-up"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-base-300 px-5 py-3">
				<div>
					<h3 class="font-bold text-base flex items-center gap-1.5">
						<IconTrain class="h-5 w-5" />
						Öffi Details
					</h3>
					<p class="text-xs text-base-content/50 mt-0.5">
						{formatDuration(segment.travelDurationMinutes ?? 0)} total ·
						{transfers}
						{transfers === 1 ? 'Umstieg' : 'Umstiege'}
					</p>
					{#if segment.transitSummary}
						<div class="flex flex-wrap gap-1 mt-1.5">
							{#each (segment.transitSummary ?? '').split(' → ') as line}
								<span class="badge badge-sm badge-primary">{line}</span>
							{/each}
						</div>
					{/if}
				</div>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={close}>
					<IconClose class="h-5 w-5" />
				</button>
			</div>

			{#if mapRenderData.hasData}
				<div class="h-48 w-full border-b border-base-300">
					<Map options={transitMapOptions} bind:instance={transitMapInstance}>
						<TileLayer
							url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
							options={{ maxZoom: 19 }}
						/>

						{#each mapRenderData.polylines as poly, idx (idx)}
							<Polyline
								latLngs={poly.coords}
								options={{
									color: poly.color,
									weight: poly.dashed ? 3 : 5,
									opacity: poly.dashed ? 0.5 : 0.85,
									dashArray: poly.dashed ? '6, 8' : undefined,
									lineCap: 'round',
									lineJoin: 'round'
								}}
							/>
						{/each}

						{#each mapRenderData.transferPts as pt, idx (idx)}
							<CircleMarker
								latLng={pt}
								options={{
									radius: 5,
									color: '#fff',
									fillColor: '#f97316',
									fillOpacity: 1,
									weight: 2
								}}
							/>
						{/each}

						{#if firstPt}
							<CircleMarker
								latLng={firstPt}
								options={{
									radius: 6,
									color: '#fff',
									fillColor: '#22c55e',
									fillOpacity: 1,
									weight: 2
								}}
							/>
						{/if}

						{#if lastPt}
							<CircleMarker
								latLng={lastPt}
								options={{
									radius: 6,
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

			<div class="overflow-y-auto flex-1 px-5 py-4">
				{#if walkTo > 0}
					<div class="flex gap-3 items-start pb-3">
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center"
							>
								<IconWalk class="h-4 w-4" />
							</div>
							<div class="w-0.5 flex-1 bg-base-300 mt-1"></div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium text-base-content/70">Walk to station</p>
							<p class="text-xs text-base-content/40">~{formatDuration(walkTo)}</p>
						</div>
					</div>
				{/if}

				{#each visibleLegs as leg, i}
					{@const wait = waitBefore(i)}

					{#if wait > 1 && leg.type === 'transport'}
						<div class="flex gap-3 items-start pb-2">
							<div class="flex flex-col items-center">
								<div class="w-0.5 h-full bg-base-300"></div>
							</div>
							<div class="flex items-center gap-1.5 py-0.5">
								<IconTimer class="h-3 w-3 text-base-content/30" />
								<span class="text-[10px] text-base-content/30"
									>{formatDuration(wait)} wait</span
								>
							</div>
						</div>
					{/if}

					<div class="flex gap-3 items-start pb-3">
						<div class="flex flex-col items-center">
							{#if leg.type === 'walking'}
								<div
									class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center"
								>
									<IconWalk class="h-4 w-4" />
								</div>
							{:else}
								<div
									class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px] font-bold leading-none"
								>
									{leg.product ?? ''}
								</div>
							{/if}
							{#if i < visibleLegs.length - 1}
								<div
									class="w-0.5 flex-1 mt-1"
									class:bg-primary={leg.type === 'transport'}
									class:bg-base-300={leg.type === 'walking'}
								></div>
							{/if}
						</div>

						<div class="flex-1 min-w-0 pt-0.5">
							{#if leg.type === 'walking'}
								<p class="text-sm text-base-content/60">Walk · {walkLabel(leg)}</p>
								{#if leg.departureStation && leg.arrivalStation && leg.departureStation !== leg.arrivalStation}
									<p class="text-xs text-base-content/40 truncate">
										{leg.departureStation} → {leg.arrivalStation}
									</p>
								{/if}
							{:else}
								<div class="flex items-center gap-2 flex-wrap">
									<span class="badge badge-sm badge-primary font-mono"
										>{lineLabel(leg)}</span
									>
									{#if leg.direction}
										<span class="text-xs text-base-content/40 truncate"
											>→ {leg.direction}</span
										>
									{/if}
								</div>

								<div class="mt-1.5 flex items-center gap-2 text-sm">
									<span class="font-mono font-semibold"
										>{fmtTime(leg.departure)}</span
									>
									<span class="truncate">{leg.departureStation}</span>
									{#if leg.platform}
										<span class="badge badge-xs badge-outline shrink-0"
											>Gl. {leg.platform}</span
										>
									{/if}
								</div>

								<div class="ml-[18px] border-l-2 border-primary/30 pl-3 py-1.5">
									<span class="text-xs text-base-content/40"
										>{formatDuration(leg.durationMinutes)}</span
									>
								</div>

								<div class="flex items-center gap-2 text-sm">
									<span class="font-mono font-semibold"
										>{fmtTime(leg.arrival)}</span
									>
									<span class="truncate">{leg.arrivalStation}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				{#if walkFrom > 0}
					<div class="flex gap-3 items-start">
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center"
							>
								<IconWalk class="h-4 w-4" />
							</div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium text-base-content/70">
								Walk from station
							</p>
							<p class="text-xs text-base-content/40">
								~{formatDuration(walkFrom)}
							</p>
						</div>
					</div>
				{/if}

				{#if visibleLegs.length === 0}
					<p class="text-sm text-base-content/50 text-center py-6">
						No detailed connection data available.
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
