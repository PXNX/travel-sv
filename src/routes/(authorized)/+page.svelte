<script lang="ts">
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import JourneyCard from '$lib/components/JourneyCard.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { cacheJourneyList, getCachedJourneyList } from '$lib/db/local';
	import { formatDuration } from '$lib/helpers';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconAutoAwesome from '~icons/material-symbols/auto-awesome-rounded';

	let { data }: { data: PageData } = $props();

	let journeys = $state<JourneyWithDerived[]>(data.journeys as JourneyWithDerived[]);
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

	const totalStops = $derived(journeys.reduce((sum, j) => sum + j.stopCount, 0));
	const totalDuration = $derived(journeys.reduce((sum, j) => sum + j.totalDurationMinutes, 0));
	const upcomingJourneys = $derived(
		journeys.filter((j) => j.startDatetime && new Date(j.startDatetime) > new Date()).length
	);
</script>

<svelte:head><title>My Journeys</title></svelte:head>

<OfflineBanner />

<div class="min-h-[100dvh] bg-base-100">
	<header class="border-b border-base-300/50 bg-base-100/80 px-4 py-4 backdrop-blur-lg sticky top-0 z-10">
		<div class="mx-auto flex max-w-2xl items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">My Journeys</h1>
				{#if journeys.length > 0}
					<p class="text-sm text-base-content/40 mt-0.5">{journeys.length} {journeys.length === 1 ? 'journey' : 'journeys'} planned</p>
				{/if}
			</div>

			<form method="POST" action="?/create" use:enhance={() => {
				isCreating = true;
				return async ({ update }) => { await update(); isCreating = false; };
			}}>
				<button class="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/20" disabled={isCreating}>
					{#if isCreating}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<IconAdd class="h-5 w-5" />
						New Journey
					{/if}
				</button>
			</form>
		</div>
	</header>

	<main class="mx-auto max-w-2xl p-4">
		{#if journeys.length === 0}
			<div class="flex flex-col items-center justify-center gap-5 py-24 text-center animate-fade-in-up">
				<div class="relative">
					<IconMap class="h-16 w-16 text-primary/70" />
					<div class="absolute -right-2 -bottom-1 animate-bounce">
						<IconAutoAwesome class="h-7 w-7 text-warning" />
					</div>
				</div>
				<div>
					<h2 class="text-xl font-bold">No journeys yet</h2>
					<p class="text-base-content/50 mt-2 max-w-xs text-sm leading-relaxed">
						Create your first journey to start planning stops, routes, and more.
					</p>
				</div>
				<form method="POST" action="?/create" use:enhance={() => {
					isCreating = true;
					return async ({ update }) => { await update(); isCreating = false; };
				}}>
					<button class="btn btn-primary shadow-lg shadow-primary/25 gap-1.5" disabled={isCreating}>
						<IconAdd class="h-5 w-5" />
						Create First Journey
					</button>
				</form>
			</div>
		{:else}
			{#if totalStops > 0 || totalDuration > 0}
				<div
					class="mb-5 grid grid-cols-3 gap-3"
					class:animate-fade-in-up={mounted}
				>
					<div class="rounded-xl bg-base-200/60 p-3 text-center">
						<div class="text-2xl font-bold text-primary">{journeys.length}</div>
						<div class="text-xs text-base-content/40 mt-0.5">{journeys.length === 1 ? 'Journey' : 'Journeys'}</div>
					</div>
					<div class="rounded-xl bg-base-200/60 p-3 text-center">
						<div class="text-2xl font-bold text-secondary">{totalStops}</div>
						<div class="text-xs text-base-content/40 mt-0.5">{totalStops === 1 ? 'Stop' : 'Stops'}</div>
					</div>
					<div class="rounded-xl bg-base-200/60 p-3 text-center">
						<div class="text-lg font-bold text-accent">{totalDuration > 0 ? formatDuration(totalDuration) : '—'}</div>
						<div class="text-xs text-base-content/40 mt-0.5">Total Time</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-col gap-3">
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
