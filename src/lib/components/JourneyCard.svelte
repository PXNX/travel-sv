<script lang="ts">
	import type { JourneyWithDerived } from '$lib/types';
	import { formatDuration } from '$lib/helpers';

	interface Props {
		journey: JourneyWithDerived;
		onclick?: (journey: JourneyWithDerived) => void;
	}

	let { journey, onclick }: Props = $props();

	const startDateFormatted = $derived(
		journey.startDatetime
			? new Date(journey.startDatetime).toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: null
	);

	const routeLabel = $derived(() => {
		if (journey.firstStopName && journey.lastStopName) {
			return `${journey.firstStopName} → ${journey.lastStopName}`;
		}
		if (journey.firstStopName) return journey.firstStopName;
		return 'No stops yet';
	});
</script>

<button
	class="card bg-base-200 hover:bg-base-300 w-full cursor-pointer shadow-md transition-colors"
	onclick={() => onclick?.(journey)}
>
	<div class="card-body gap-1 p-4">
		<h2 class="card-title text-base">{journey.title}</h2>
		<p class="text-base-content/60 text-sm">{routeLabel()}</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#if startDateFormatted}
				<span class="badge badge-outline badge-sm">📅 {startDateFormatted}</span>
			{/if}
			{#if journey.stopCount > 0}
				<span class="badge badge-outline badge-sm">📍 {journey.stopCount} stops</span>
			{/if}
			{#if journey.totalDurationMinutes > 0}
				<span class="badge badge-outline badge-sm">⏱ {formatDuration(journey.totalDurationMinutes)}</span>
			{/if}
		</div>
	</div>
</button>
