<script lang="ts">
	// Route Ledger: a quiet, searchable archive for trips that are intentionally view only.
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import JourneyCard from '$lib/components/JourneyCard.svelte';
	import { EmptyState, PageHeader, StatTile } from '$lib/components/ui';
	import { formatDuration } from '$lib/helpers';
	import { goto } from '$app/navigation';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';
	import IconSearch from '~icons/material-symbols/search-rounded';

	let { data }: { data: PageData } = $props();
	let search = $state('');
	const journeys = $derived(data.journeys as JourneyWithDerived[]);
	const visibleJourneys = $derived(
		journeys.filter((journey) =>
			journey.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
		)
	);
	const totalStops = $derived(journeys.reduce((sum, journey) => sum + journey.stopCount, 0));
	const totalDuration = $derived(
		journeys.reduce((sum, journey) => sum + journey.totalDurationMinutes, 0)
	);

	function openJourney(journey: JourneyWithDerived) {
		goto(`/journeys/${journey.id}`);
	}
</script>

<svelte:head><title>Completed Trips</title></svelte:head>

<div class="travel-page">
	<PageHeader title="Completed Trips" subtitle="A read-only record of journeys you have finished.">
		{#snippet actions()}<a href="/" class="btn btn-ghost btn-sm gap-1.5"
				><IconArrowBack class="h-4 w-4" />Active trips</a
			>{/snippet}
	</PageHeader>

	<main class="mx-auto max-w-2xl p-4 sm:p-5">
		{#if journeys.length === 0}
			<EmptyState
				icon={IconCheckCircle}
				title="No completed trips yet"
				description="Trips you mark as completed will be preserved here as view-only records."
			/>
		{:else}
			<div class="mb-5 grid grid-cols-3 gap-px border-y border-[#172a45]/20 bg-[#172a45]/20">
				<StatTile
					value={journeys.length}
					label={journeys.length === 1 ? 'Trip' : 'Trips'}
					tone="primary"
				/>
				<StatTile value={totalStops} label={totalStops === 1 ? 'Stop' : 'Stops'} tone="secondary" />
				<StatTile
					value={totalDuration > 0 ? formatDuration(totalDuration) : '—'}
					label="Recorded time"
					tone="accent"
				/>
			</div>

			<label
				class="mb-4 flex items-center gap-2 border-b border-[#172a45]/25 bg-[#fffdf7] px-3 py-2.5"
				for="completed-trip-search"
			>
				<IconSearch class="h-5 w-5 text-[#174a7e]" />
				<input
					id="completed-trip-search"
					class="min-w-0 flex-1 bg-transparent text-sm outline-none"
					bind:value={search}
					placeholder="Search completed trips by name"
				/>
			</label>

			{#if visibleJourneys.length > 0}
				<div class="flex flex-col gap-3 border-t border-[#172a45]/25 pt-3">
					{#each visibleJourneys as journey (journey.id)}
						<div class="relative">
							<JourneyCard {journey} onclick={openJourney} /><span
								class="pointer-events-none absolute top-3 right-3 border border-[#008d4f]/30 bg-[#effaf4] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-[#008d4f] uppercase"
								>Completed</span
							>
						</div>
					{/each}
				</div>
			{:else}
				<p class="border-y border-[#172a45]/15 px-3 py-5 text-sm text-[#172a45]/60">
					No completed trip matches “{search}”.
				</p>
			{/if}
		{/if}
	</main>
</div>
