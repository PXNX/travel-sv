<script lang="ts">
	import type { Segment, TransitLeg } from '$lib/types';
	import { formatDuration, formatDistance } from '$lib/helpers';
	import { onDestroy } from 'svelte';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconBus from '~icons/material-symbols/directions-bus-outline-rounded';
	import IconTram from '~icons/material-symbols/tram-outline-rounded';
	import IconSubway from '~icons/material-symbols/subway-outline-rounded';
	import IconWalk from '~icons/material-symbols/directions-walk-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconTimer from '~icons/material-symbols/timer-outline-rounded';

	const productColors: Record<string, string> = {
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

	function productColor(product?: string): string {
		if (!product) return '#3b82f6';
		return productColors[product] ?? '#3b82f6';
	}

	interface Props {
		open: boolean;
		segment: Segment | null;
		onclose?: () => void;
	}

	let { open = $bindable(false), segment, onclose }: Props = $props();

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

{#if open && segment}
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

			<div class="overflow-y-auto flex-1 px-5 py-4">
				{#if walkTo > 0}
					<div class="flex gap-3 items-start pb-3 rounded-lg transition-colors {walkToActive ? 'bg-primary/10 -mx-2 px-2 py-1.5' : ''}">
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center transition-all {walkToActive ? 'bg-primary text-primary-content ring-2 ring-primary/30 ring-offset-1' : 'bg-base-300'}"
							>
								<IconWalk class="h-4 w-4" />
							</div>
							<div class="w-0.5 flex-1 bg-base-300 mt-1"></div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium {walkToActive ? 'text-primary' : 'text-base-content/70'}">Walk to station</p>
							<p class="text-xs text-base-content/40">~{formatDuration(walkTo)}</p>
						</div>
					</div>
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

					{@const color = leg.type === 'transport' ? productColor(leg.product) : ''}
					<div class="flex gap-3 items-start pb-3 rounded-lg transition-colors" style={active ? `background: ${color || 'oklch(var(--p))'}15; margin-inline: -0.5rem; padding: 0.375rem 0.5rem;` : ''}>
						<div class="flex flex-col items-center">
							{#if leg.type === 'walking'}
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center transition-all {active ? 'text-white ring-2 ring-offset-1' : 'bg-base-300'}"
									style={active ? 'background: oklch(var(--p)); --tw-ring-color: oklch(var(--p) / 0.3)' : ''}
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
					</div>
				{/each}

				{#if walkFrom > 0}
					<div class="flex gap-3 items-start rounded-lg transition-colors {walkFromActive ? 'bg-primary/10 -mx-2 px-2 py-1.5' : ''}">
						<div class="flex flex-col items-center">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center transition-all {walkFromActive ? 'bg-primary text-primary-content ring-2 ring-primary/30 ring-offset-1' : 'bg-base-300'}"
							>
								<IconWalk class="h-4 w-4" />
							</div>
						</div>
						<div class="pt-1">
							<p class="text-sm font-medium {walkFromActive ? 'text-primary' : 'text-base-content/70'}">
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
