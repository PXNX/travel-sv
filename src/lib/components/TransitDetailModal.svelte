<script lang="ts">
	import type { Segment, TransitLeg } from '$lib/types';
	import { formatDuration, formatDistance } from '$lib/helpers';
	import { onDestroy } from 'svelte';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconBus from '~icons/material-symbols/directions-bus-outline-rounded';
	import IconTram from '~icons/material-symbols/tram-outline-rounded';
	import IconSubway from '~icons/material-symbols/subway-outline-rounded';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconTimer from '~icons/material-symbols/timer-outline-rounded';
	import IconChevronLeft from '~icons/material-symbols/chevron-left-rounded';
	import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
	import { Modal, transitColor } from '$lib/components/ui';

	interface Props {
		open: boolean;
		segment: Segment | null;
		onclose?: () => void;
		onwalkclick?: (segment: Segment, fromName: string, toName: string) => void;
		onconnectionchange?: (segment: Segment, direction: -1 | 1) => void;
		changingConnection?: boolean;
		fromCoords?: [number, number];
		toCoords?: [number, number];
	}

	let { open = $bindable(false), segment, onclose, onwalkclick, onconnectionchange, changingConnection = false, fromCoords, toCoords }: Props = $props();

	const legs = $derived((segment?.transitLegs ?? []) as TransitLeg[]);
	const transfers = $derived(segment?.transfers ?? 0);
	const walkTo = $derived(segment?.walkToStationMin ?? 0);
	const walkFrom = $derived(segment?.walkFromStationMin ?? 0);
	const accessWalkTo = $derived(legs[0]?.type === 'walking' ? legs[0] : undefined);
	const accessWalkFrom = $derived(legs.at(-1)?.type === 'walking' ? legs.at(-1) : undefined);
	const firstTransport = $derived(legs.find((leg) => leg.type === 'transport'));

	const visibleLegs = $derived.by(() =>
		legs.filter((leg, index) => {
			if (leg.type !== 'walking') return true;
			if (leg.durationMinutes <= 0) return false;
			// The dedicated access rows already represent first and last walking legs.
			if (index === 0 && walkTo > 0) return false;
			if (index === legs.length - 1 && walkFrom > 0) return false;
			return true;
		})
	);

	let now = $state(Date.now());
	let timer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		if (open) {
			now = Date.now();
			timer = setInterval(() => { now = Date.now(); }, 30_000);
		} else {
			if (timer) { clearInterval(timer); timer = undefined; }
		}
	});
	onDestroy(() => { if (timer) clearInterval(timer); });

	const walkToActive = $derived.by(() => {
		if (walkTo <= 0 || visibleLegs.length === 0) return false;
		const first = visibleLegs[0];
		if (!first?.departure) return false;
		const dep = new Date(first.departure).getTime();
		return now >= dep - walkTo * 60_000 && now < dep;
	});

	const walkFromActive = $derived.by(() => {
		if (walkFrom <= 0 || visibleLegs.length === 0) return false;
		const last = visibleLegs[visibleLegs.length - 1];
		if (!last?.arrival) return false;
		const arr = new Date(last.arrival).getTime();
		return now >= arr && now <= arr + walkFrom * 60_000;
	});

	const activeLegIndex = $derived.by(() => {
		for (let i = 0; i < visibleLegs.length; i++) {
			const leg = visibleLegs[i];
			if (leg.departure && leg.arrival) {
				const dep = new Date(leg.departure).getTime();
				const arr = new Date(leg.arrival).getTime();
				if (now >= dep && now <= arr) return i;
			}
		}
		return -1;
	});

	function lineLabel(leg: TransitLeg): string {
		const rawProduct = leg.product ?? '';
		const n = leg.lineName ?? '';
		const product = ({ HIGHSPEED_RAIL: 'ICE', SUBWAY: 'U', SUBURBAN: 'S', BUS: 'Bus', TRAM: 'Tram', RAIL: 'RB' } as Record<string, string>)[rawProduct] ?? rawProduct;
		if (n && product && n.toLowerCase().startsWith(product.toLowerCase())) return n;
		if (product && n) return `${product} ${n}`;
		return n || product || 'Öffi';
	}

	function walkLabel(leg: TransitLeg): string {
		const parts = [leg.durationMinutes > 0 ? `~${formatDuration(leg.durationMinutes)}` : '', leg.distanceM && leg.distanceM > 0 ? formatDistance(leg.distanceM) : ''].filter(Boolean);
		return parts.join(' · ');
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

	const walkToClickable = $derived.by(() => {
		if (!onwalkclick || walkTo <= 0 || !fromCoords || visibleLegs.length === 0) return false;
		const first = visibleLegs[0];
		return first?.departureLat != null && first?.departureLon != null;
	});

	const walkFromClickable = $derived.by(() => {
		if (!onwalkclick || walkFrom <= 0 || !toCoords || visibleLegs.length === 0) return false;
		const last = visibleLegs[visibleLegs.length - 1];
		return last?.arrivalLat != null && last?.arrivalLon != null;
	});

	function isWalkingLegClickable(leg: TransitLeg): boolean {
		if (!onwalkclick || leg.type !== 'walking') return false;
		return !!(leg.polyline?.length || (leg.departureLat != null && leg.arrivalLat != null));
	}

	function handleWalkToClick() {
		if (!onwalkclick || !segment || !fromCoords) return;
		const firstLeg = visibleLegs[0];
		if (!firstLeg?.departureLat || !firstLeg?.departureLon) return;
		const geo: [number, number][] = [fromCoords, [firstLeg.departureLat, firstLeg.departureLon]];
		const synth: Segment = {
			id: -1, journeyId: segment.journeyId,
			fromStopId: segment.fromStopId, toStopId: segment.toStopId,
			mode: 'walk', walkGeometry: geo,
			travelDurationMinutes: walkTo,
		};
		onwalkclick(synth, 'Start', firstLeg.departureStation ?? 'Station');
	}

	function handleWalkFromClick() {
		if (!onwalkclick || !segment || !toCoords) return;
		const lastLeg = visibleLegs[visibleLegs.length - 1];
		if (!lastLeg?.arrivalLat || !lastLeg?.arrivalLon) return;
		const geo: [number, number][] = [[lastLeg.arrivalLat, lastLeg.arrivalLon], toCoords];
		const synth: Segment = {
			id: -1, journeyId: segment.journeyId,
			fromStopId: segment.fromStopId, toStopId: segment.toStopId,
			mode: 'walk', walkGeometry: geo,
			travelDurationMinutes: walkFrom,
		};
		onwalkclick(synth, lastLeg.arrivalStation ?? 'Station', 'Destination');
	}

	function handleWalkingLegClick(leg: TransitLeg) {
		if (!onwalkclick || !segment) return;
		let geo: [number, number][] | null = leg.polyline ?? null;
		if (!geo && leg.departureLat != null && leg.departureLon != null && leg.arrivalLat != null && leg.arrivalLon != null) {
			geo = [[leg.departureLat, leg.departureLon], [leg.arrivalLat, leg.arrivalLon]];
		}
		if (!geo) return;
		const synth: Segment = {
			id: -1, journeyId: segment.journeyId,
			fromStopId: segment.fromStopId, toStopId: segment.toStopId,
			mode: 'walk', walkGeometry: geo,
			distanceM: leg.distanceM,
			travelDurationMinutes: leg.durationMinutes,
		};
		onwalkclick(synth, leg.departureStation ?? '', leg.arrivalStation ?? '');
	}
</script>

<Modal bind:open title="Öffi Details" icon={IconTrain} layer="raised" {onclose}>
	{#snippet subtitle()}
		{#if segment}
			{formatDuration(segment.travelDurationMinutes ?? 0)} total · {transfers}
			{transfers === 1 ? 'Umstieg' : 'Umstiege'}
			{#if segment.transitSummary}
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each segment.transitSummary.split(' → ') as line (line)}
						<span class="badge badge-sm badge-primary">{line}</span>
					{/each}
				</div>
			{/if}
		{/if}
	{/snippet}

		{#if segment}
			{#if firstTransport}
				<div class="mb-4 flex items-center justify-between gap-2 border-y border-[#172a45]/15 py-2">
					<button class="btn btn-ghost btn-xs btn-square" aria-label="Earlier connection" disabled={changingConnection} onclick={() => onconnectionchange?.(segment!, -1)}>
						<IconChevronLeft class="h-4 w-4" />
					</button>
					<div class="min-w-0 text-center">
						<p class="text-[10px] font-bold tracking-[0.08em] text-[#a45e38] uppercase">Connections from</p>
						<p class="truncate text-sm font-semibold">{firstTransport.departureStation}</p>
					</div>
					<button class="btn btn-ghost btn-xs btn-square" aria-label="Later connection" disabled={changingConnection} onclick={() => onconnectionchange?.(segment!, 1)}>
						<IconChevronRight class="h-4 w-4" />
					</button>
				</div>
			{/if}
					{#if walkTo > 0}
					<svelte:element
						this={walkToClickable ? 'button' : 'div'}
						type={walkToClickable ? 'button' : undefined}
						class="flex gap-3 items-start pb-3 rounded-lg transition-colors {walkToActive ? 'bg-primary/10 -mx-2 px-2 py-1.5' : ''} {walkToClickable ? 'cursor-pointer hover:bg-base-200/60' : ''}"
						onclick={walkToClickable ? handleWalkToClick : undefined}
						onkeydown={walkToClickable ? (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && handleWalkToClick() : undefined}
					>
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center transition-all {walkToActive ? 'bg-primary text-primary-content ring-2 ring-primary/30 ring-offset-1' : 'bg-base-300'}"
							>
								<IconWalk class="h-4 w-4" />
							</div>
							<div class="w-0.5 flex-1 bg-base-300 mt-1"></div>
						</div>
						<div class="pt-1 flex-1">
								<p class="text-sm font-medium {walkToActive ? 'text-primary' : 'text-base-content/70'}">Walk to station · {walkLabel({ durationMinutes: walkTo, distanceM: accessWalkTo?.distanceM } as TransitLeg)}</p>
						</div>
						{#if walkToClickable}
							<span class="text-[10px] text-primary self-center opacity-60">map ›</span>
						{/if}
						</svelte:element>
						{/if}

				{#each visibleLegs as leg, i}
					{@const wait = waitBefore(i)}
					{@const active = activeLegIndex === i}

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

					{@const color = leg.type === 'transport' ? transitColor(leg.product) : ''}
					{@const clickableWalk = leg.type === 'walking' && isWalkingLegClickable(leg)}
					<svelte:element
						this={clickableWalk ? 'button' : 'div'}
						type={clickableWalk ? 'button' : undefined}
						class="flex gap-3 items-start pb-3 rounded-lg transition-colors {clickableWalk ? 'cursor-pointer hover:bg-base-200/60' : ''}"
						style={active
							? `background: ${color ? color + '15' : 'color-mix(in oklch, var(--color-primary) 8%, transparent)'}; margin-inline: -0.5rem; padding: 0.375rem 0.5rem;`
							: ''}
						onclick={clickableWalk ? () => handleWalkingLegClick(leg) : undefined}
						onkeydown={clickableWalk ? (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && handleWalkingLegClick(leg) : undefined}
					>
						<div class="flex flex-col items-center">
							{#if leg.type === 'walking'}
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center transition-all {active ? 'text-white ring-2 ring-offset-1' : 'bg-base-300'}"
									style={active
										? 'background: var(--color-primary); --tw-ring-color: color-mix(in oklch, var(--color-primary) 30%, transparent)'
										: ''}
								>
									<IconWalk class="h-4 w-4" />
								</div>
							{:else}
								<div
									class="w-8 h-8 rounded-full text-white flex items-center justify-center text-[10px] font-bold leading-none transition-all {active ? 'ring-2 ring-offset-1' : ''}"
									style="background: {color}; {active ? `--tw-ring-color: ${color}50` : ''}"
								>
									{#if leg.product === 'Bus'}
										<IconBus class="h-4 w-4" />
									{:else if leg.product === 'STR'}
										<IconTram class="h-4 w-4" />
									{:else if leg.product === 'U'}
										<IconSubway class="h-4 w-4" />
									{:else}
										<IconTrain class="h-4 w-4" />
									{/if}
								</div>
							{/if}
							{#if i < visibleLegs.length - 1}
								<div
									class="w-0.5 flex-1 mt-1"
									class:bg-base-300={leg.type === 'walking'}
									style={leg.type === 'transport' ? `background: ${color}` : ''}
								></div>
							{/if}
						</div>

						<div class="flex-1 min-w-0 pt-0.5">
							{#if leg.type === 'walking'}
								<p class="text-sm {active ? 'text-primary font-medium' : 'text-base-content/60'}">Walk · {walkLabel(leg)}</p>
								{#if leg.departureStation && leg.arrivalStation && leg.departureStation !== leg.arrivalStation}
									<p class="text-xs text-base-content/40 truncate">
										{leg.departureStation} → {leg.arrivalStation}
									</p>
								{/if}
							{:else}
								<div class="flex items-center gap-2 flex-wrap">
									<span class="badge badge-sm font-mono text-white border-0" style="background: {color}">{lineLabel(leg)}</span>
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

								<div class="ml-[18px] border-l-2 pl-3 py-1.5" style="border-color: {color}50">
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

						{#if clickableWalk}
							<span class="text-[10px] text-primary self-center opacity-60 shrink-0">map ›</span>
						{/if}
						</svelte:element>
				{/each}

				{#if walkFrom > 0}
					<svelte:element
						this={walkFromClickable ? 'button' : 'div'}
						type={walkFromClickable ? 'button' : undefined}
						class="flex gap-3 items-start rounded-lg transition-colors {walkFromActive ? 'bg-primary/10 -mx-2 px-2 py-1.5' : ''} {walkFromClickable ? 'cursor-pointer hover:bg-base-200/60' : ''}"
						onclick={walkFromClickable ? handleWalkFromClick : undefined}
						onkeydown={walkFromClickable ? (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && handleWalkFromClick() : undefined}
					>
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center transition-all {walkFromActive ? 'bg-primary text-primary-content ring-2 ring-primary/30 ring-offset-1' : 'bg-base-300'}"
							>
								<IconWalk class="h-4 w-4" />
							</div>
						</div>
						<div class="pt-1 flex-1">
								<p class="text-sm font-medium {walkFromActive ? 'text-primary' : 'text-base-content/70'}">Walk from station · {walkLabel({ durationMinutes: walkFrom, distanceM: accessWalkFrom?.distanceM } as TransitLeg)}</p>
						</div>
						{#if walkFromClickable}
							<span class="text-[10px] text-primary self-center opacity-60">map ›</span>
						{/if}
						</svelte:element>
						{/if}

		{#if visibleLegs.length === 0}
			<p class="text-base-content/50 py-6 text-center text-sm">
				No detailed connection data available.
			</p>
		{/if}
	{/if}
</Modal>
