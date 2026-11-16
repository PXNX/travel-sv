<script lang="ts">
	// Route register: every journey as a filed slip, with search and sorting.
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
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';
	import IconSearch from '~icons/material-symbols/search-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconArrowDownward from '~icons/material-symbols/arrow-downward-rounded';

	let { data }: { data: PageData } = $props();

	let journeys = $state<JourneyWithDerived[]>([]);
	$effect.pre(() => {
		journeys = data.journeys as JourneyWithDerived[];
	});
	let isCreating = $state(false);
	let mounted = $state(false);
	let search = $state('');
	type SortKey = 'recent' | 'name' | 'duration';
	let sort = $state<SortKey>('recent');

	const sortOptions: { value: SortKey; label: string }[] = [
		{ value: 'recent', label: 'Recent' },
		{ value: 'name', label: 'Name' },
		{ value: 'duration', label: 'Length' }
	];

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

	const visibleJourneys = $derived.by(() => {
		const term = search.trim().toLocaleLowerCase();
		const filtered = term
			? journeys.filter(
					(j) =>
						j.title.toLocaleLowerCase().includes(term) ||
						(j.firstStopName ?? '').toLocaleLowerCase().includes(term) ||
						(j.lastStopName ?? '').toLocaleLowerCase().includes(term)
				)
			: [...journeys];

		return filtered.sort((a, b) => {
			if (sort === 'name') return a.title.localeCompare(b.title);
			if (sort === 'duration') return b.totalDurationMinutes - a.totalDurationMinutes;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	});

	const stats = $derived([
		{
			value: journeys.length,
			label: journeys.length === 1 ? 'Journey' : 'Journeys',
			tone: 'primary' as const
		},
		{ value: totalStops, label: totalStops === 1 ? 'Stop' : 'Stops', tone: 'secondary' as const },
		{
			value: totalDuration > 0 ? formatDuration(totalDuration) : '—',
			label: 'Total time',
			tone: 'accent' as const
		}
	]);
</script>

<svelte:head><title>My Journeys</title></svelte:head>

<OfflineBanner />

<div class="travel-page">
	<PageHeader
		title="My Journeys"
		subtitle={journeys.length > 0
			? `${journeys.length} ${journeys.length === 1 ? 'journey' : 'journeys'} in the register`
			: 'Your route register'}
	>
		{#snippet actions()}
			<form method="POST" action="?/create" use:enhance={trackCreate}>
				<Button type="submit" size="sm" icon={IconAdd} loading={isCreating}>New Journey</Button>
			</form>
		{/snippet}
	</PageHeader>

	<main class="mx-auto max-w-2xl p-4 sm:p-5">
		{#if data.completedCount > 0}
			<a
				href="/journeys/completed"
				class="group animate-glide-in mb-4 flex items-center justify-between border border-l-4 border-[#172a45]/25 border-l-[#2f7d58] bg-[#fffdf7] px-3 py-2.5 text-sm font-semibold text-[#172a45] transition-all hover:-translate-y-px hover:shadow-[3px_4px_0_rgba(23,42,69,0.12)]"
			>
				<span class="flex items-center gap-2">
					<IconCheckCircle class="h-5 w-5 text-[#2f7d58]" />Completed trips
				</span>
				<span
					class="text-xs font-medium text-[#a45e38] transition-transform group-hover:translate-x-0.5"
				>
					{data.completedCount}
					{data.completedCount === 1 ? 'trip' : 'trips'} →
				</span>
			</a>
		{/if}

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
				<div class="mb-5 grid grid-cols-3 border-y border-[#172a45]/20">
					{#each stats as stat, i}
						<StatTile {...stat} delay={i * 80} />
					{/each}
				</div>
			{/if}

			<!-- register tools -->
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<label
					class="flex min-w-[180px] flex-1 items-center gap-2 border border-[#172a45]/25 bg-[#fffdf7] px-3 py-2 focus-within:border-[#a45e38]"
				>
					<IconSearch class="h-4 w-4 shrink-0 text-[#a45e38]" />
					<input
						class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#172a45]/35"
						type="search"
						bind:value={search}
						placeholder="Search journeys or places…"
						aria-label="Search journeys"
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
				<span class="flex items-center gap-1 text-[#a45e38]"
					><IconArrowDownward class="h-4 w-4" /></span
				>
				<div
					class="flex gap-px border border-[#172a45]/30 bg-[#efe6d5] p-px"
					role="radiogroup"
					aria-label="Sort journeys"
				>
					{#each sortOptions as option}
						<button
							type="button"
							role="radio"
							aria-checked={sort === option.value}
							class="px-2.5 py-1.5 text-[11px] font-bold transition-all {sort === option.value
								? 'animate-soft-pop bg-[#172a45] text-[#fffdf7]'
								: 'text-[#172a45]/55 hover:bg-[#e6a527]/15'}"
							onclick={() => (sort = option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			{#if visibleJourneys.length > 0}
				<div class="flex flex-col gap-2.5">
					{#each visibleJourneys as journey, i (journey.id)}
						<div
							class:animate-fade-in-up={mounted}
							style={mounted ? `animation-delay: ${i * 55}ms` : ''}
						>
							<JourneyCard {journey} index={i} onclick={openJourney} />
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="border border-dashed border-[#172a45]/30 bg-[#fffdf7]/70 px-4 py-10 text-center"
				>
					<p class="travel-display text-lg text-[#172a45]">No matches in the register</p>
					<p class="mt-1 text-xs text-[#a45e38]">Try another name or place, or clear the search.</p>
					<button class="btn btn-ghost btn-sm mt-3" onclick={() => (search = '')}
						>Clear search</button
					>
				</div>
			{/if}
		{/if}
	</main>
</div>
