<script lang="ts">
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { PageHeader } from '$lib/ui';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';

	let { data }: { data: PageData } = $props();
	const journeys = $derived(data.journeys as JourneyWithDerived[]);
</script>

<svelte:head><title>Route overview — Travel Planner</title></svelte:head>

<div class="travel-page pb-24 lg:pb-8">
	<PageHeader title="Route overview">
		{#snippet actions()}
			<button class="btn btn-ghost btn-sm" onclick={() => goto('/')} aria-label="Back to planner">
				<IconArrowBack class="h-4 w-4" /> Plan
			</button>
		{/snippet}
	</PageHeader>

	<main class="mx-auto max-w-5xl p-4 sm:p-6">
		<div class="paper-sheet animate-unfold overflow-hidden">
			<div class="flex items-center gap-2 border-b border-[#1b2b3a]/15 px-4 py-3">
				<IconTrain class="h-5 w-5 text-[#a24e2c]" />
				<p class="text-sm font-semibold text-[#1b2b3a]">
					{journeys.length}
					{journeys.length === 1 ? 'journey' : 'journeys'}
				</p>
			</div>
			{#if browser}
				{#await import('$lib/maps/AllJourneysMap.svelte') then { default: AllJourneysMap }}
					<AllJourneysMap {journeys} onopen={(id) => goto(`/journeys/${id}`)} />
				{/await}
			{/if}
		</div>
	</main>
</div>
