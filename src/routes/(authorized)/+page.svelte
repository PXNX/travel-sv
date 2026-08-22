<script lang="ts">
	// Papier & Tinte: travel index as a restrained route register rather than a dashboard.
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import JourneyCard from '$lib/components/JourneyCard.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import { Button, EmptyState, PageHeader, StatTile } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { cacheJourneyList, getCachedJourneyList } from '$lib/db/local';
	import { formatDuration } from '$lib/helpers';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconAutoAwesome from '~icons/material-symbols/auto-awesome-rounded';

	let { data }: { data: PageData } = $props();

	let journeys = $state<JourneyWithDerived[]>([]);
	$effect.pre(() => {
		journeys = data.journeys as JourneyWithDerived[];
	});
	let isCreating = $state(false);
	let mounted = $state(false);

	onMount(async () => {
		mounted = true;
		if (data.user?.id) {
			const cached = await getCachedJourneyList(data.user.id);
			if (cached && journeys.length === 0) journeys = cached as JourneyWithDerived[];
			await cacheJourneyList(data.user.id, data.journeys);
		}
	});

	function openJourney(journey: JourneyWithDerived) {
		goto(`/journeys/${journey.id}`);
	}

	function trackCreate() {
		isCreating = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isCreating = false;
		};
	}

	const totalStops = $derived(journeys.reduce((sum, j) => sum + j.stopCount, 0));
	const totalDuration = $derived(journeys.reduce((sum, j) => sum + j.totalDurationMinutes, 0));
</script>

<svelte:head><title>My Journeys</title></svelte:head>

<OfflineBanner />

<div class="travel-page">
	<PageHeader
		title="My Journeys"
		subtitle={journeys.length > 0
			? `${journeys.length} ${journeys.length === 1 ? 'journey' : 'journeys'} planned`
			: undefined}
	>
		{#snippet actions()}
			<form method="POST" action="?/create" use:enhance={trackCreate}>
				<Button type="submit" size="sm" icon={IconAdd} loading={isCreating}>New Journey</Button>
			</form>
		{/snippet}
	</PageHeader>

		<main class="mx-auto max-w-2xl p-4 sm:p-5">
		{#if journeys.length === 0}
			<EmptyState
				icon={IconMap}
				accentIcon={IconAutoAwesome}
				title="No journeys yet"
				description="Create your first journey to start planning stops, routes, and more."
			>
				<form method="POST" action="?/create" use:enhance={trackCreate}>
					<Button type="submit" icon={IconAdd} loading={isCreating}>Create First Journey</Button>
				</form>
			</EmptyState>
		{:else}
			{#if totalStops > 0 || totalDuration > 0}
					<div class="mb-5 grid grid-cols-3 gap-px border-y border-[#172a45]/20 bg-[#172a45]/20" class:animate-fade-in-up={mounted}>
					<StatTile
						value={journeys.length}
						label={journeys.length === 1 ? 'Journey' : 'Journeys'}
						tone="primary"
					/>
					<StatTile value={totalStops} label={totalStops === 1 ? 'Stop' : 'Stops'} tone="secondary" />
					<StatTile
						value={totalDuration > 0 ? formatDuration(totalDuration) : '—'}
						label="Total Time"
						tone="accent"
					/>
				</div>
			{/if}

				<div class="flex flex-col gap-3 border-t border-[#172a45]/25 pt-3">
				{#each journeys as journey, i (journey.id)}
					<div
						class:animate-fade-in-up={mounted}
						style={mounted ? `animation-delay: ${i * 60}ms` : ''}
					>
						<JourneyCard {journey} onclick={openJourney} />
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
