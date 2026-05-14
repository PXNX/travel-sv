<script lang="ts">
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import JourneyCard from '$lib/components/JourneyCard.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { cacheJourneyList, getCachedJourneyList } from '$lib/db/local';

	let { data }: { data: PageData } = $props();

	let journeys = $state<JourneyWithDerived[]>(data.journeys as JourneyWithDerived[]);
	let isCreating = $state(false);

	onMount(async () => {
		if (data.user?.id) {
			const cached = await getCachedJourneyList(data.user.id);
			if (cached && journeys.length === 0) journeys = cached as JourneyWithDerived[];
			await cacheJourneyList(data.user.id, data.journeys);
		}
	});

	function openJourney(journey: JourneyWithDerived) {
		goto(`/journeys/${journey.id}`);
	}
</script>

<svelte:head><title>My Journeys</title></svelte:head>

<OfflineBanner />

<div class="min-h-[100dvh] bg-base-100">
	<header class="flex items-center justify-between border-b border-base-300 px-4 py-3">
		<h1 class="text-xl font-bold">My Journeys</h1>

		<form method="POST" action="?/create" use:enhance={() => {
			isCreating = true;
			return async ({ update }) => { await update(); isCreating = false; };
		}}>
			<button class="btn btn-primary btn-sm" disabled={isCreating}>
				{#if isCreating}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					＋ New Journey
				{/if}
			</button>
		</form>
	</header>

	<main class="mx-auto max-w-2xl p-4">
		{#if journeys.length === 0}
			<div class="flex flex-col items-center justify-center gap-4 py-20 text-center">
				<div class="text-6xl">🗺️</div>
				<h2 class="text-xl font-semibold">No journeys yet</h2>
				<p class="text-base-content/60 max-w-xs">
					Create your first journey to start planning stops, routes, and more.
				</p>
				<form method="POST" action="?/create" use:enhance={() => {
					isCreating = true;
					return async ({ update }) => { await update(); isCreating = false; };
				}}>
					<button class="btn btn-primary" disabled={isCreating}>＋ Create First Journey</button>
				</form>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each journeys as journey (journey.id)}
					<JourneyCard {journey} onclick={openJourney} />
				{/each}
			</div>
		{/if}
	</main>
</div>
