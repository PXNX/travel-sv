<script lang="ts">
	// Route ledger: a quiet, searchable archive of finished trips.
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import JourneyCard from '$lib/components/JourneyCard.svelte';
	import { EmptyState, PageHeader, StatTile } from '$lib/components/ui';
	import { formatDuration } from '$lib/helpers';
	import { goto } from '$app/navigation';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';
	import IconSearch from '~icons/material-symbols/search-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';

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
</script>

<svelte:head><title>Completed Trips</title></svelte:head>

<div class="travel-page">
	<PageHeader title="Completed Trips" subtitle="A read-only record of journeys you have finished.">
		{#snippet actions()}
			<a href="/" class="btn btn-ghost btn-sm gap-1.5">
				<IconArrowBack class="h-4 w-4" /> Active trips
			</a>
		{/snippet}
	</PageHeader>

	<main class="mx-auto max-w-2xl p-4 sm:p-5">
		{#if journeys.length === 0}
			<EmptyState
				icon={IconCheckCircle}
				title="No completed trips yet"
				description="Trips you mark as completed will be preserved here as view-only records."
			/>
		{:else}
			<div class="mb-5 grid grid-cols-3 border-y border-[#172a45]/20">
				<StatTile
					value={journeys.length}
					label={journeys.length === 1 ? 'Trip' : 'Trips'}
					delay={0}
				/>
				<StatTile
					value={totalStops}
					label={totalStops === 1 ? 'Stop' : 'Stops'}
					tone="secondary"
					delay={80}
				/>
				<StatTile
					value={totalDuration > 0 ? formatDuration(totalDuration) : '—'}
					label="Recorded time"
					tone="accent"
					delay={160}
				/>
			</div>

			<label
				class="mb-3 flex items-center gap-2 border border-[#172a45]/25 bg-[#fffdf7] px-3 py-2.5 focus-within:border-[#a45e38]"
				for="completed-trip-search"
			>
				<IconSearch class="h-5 w-5 shrink-0 text-[#a45e38]" />
				<input
					id="completed-trip-search"
					class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#172a45]/35"
					bind:value={search}
					placeholder="Search completed trips by name"
				/>
				{#if search}
					<button
						class="text-[#172a45]/40 hover:text-[#a45e38]"
						aria-label="Clear search"
						onclick={() => (search = '')}
					>
						<IconClose class="h-4 w-4" />
					</button>
				{/if}
			</label>

			{#if visibleJourneys.length > 0}
				<div class="flex flex-col gap-2.5">
					{#each visibleJourneys as journey, i (journey.id)}
						<div class="animate-fade-in-up" style={`animation-delay: ${i * 55}ms`}>
							<div class="relative">
								<JourneyCard {journey} index={i} onclick={() => goto(`/journeys/${journey.id}`)} />
								<span
									class="pointer-events-none absolute top-2 right-3 border border-[#2f7d58]/40 bg-[#f1f6f1] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-[#2f7d58] uppercase"
								>
									Completed
								</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="border border-dashed border-[#172a45]/30 bg-[#fffdf7]/70 px-4 py-10 text-center"
				>
					<p class="travel-display text-lg text-[#172a45]">No trip matches “{search}”</p>
					<p class="mt-1 text-xs text-[#a45e38]">Try a different name.</p>
				</div>
			{/if}
		{/if}
	</main>
</div>
