<script lang="ts">
	// Travel Planner home: plan a trip first, then pick up saved journeys.
	import type { PageData } from './$types';
	import type { JourneyWithDerived } from '$lib/types';
	import { cacheJourneyList, getCachedJourneyList } from '$lib/offline/local';
	import { formatDuration } from '$lib/helpers';
	import JourneyPlanner from '$lib/journeys/JourneyPlanner.svelte';
	import JourneyCard from '$lib/journeys/JourneyCard.svelte';
	import OfflineBanner from '$lib/app/OfflineBanner.svelte';
	import { Button, EmptyState, StatTile } from '$lib/ui';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import IconAdd from '~icons/material-symbols/add-rounded';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconAutoAwesome from '~icons/material-symbols/auto-awesome-rounded';
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';
	import IconSearch from '~icons/material-symbols/search-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconHistory from '~icons/material-symbols/history-rounded';
	import IconPin from '~icons/material-symbols/location-on-rounded';
	import IconClock from '~icons/material-symbols/schedule-rounded';

	let { data }: { data: PageData } = $props();

	let journeys = $state<JourneyWithDerived[]>([]);
	$effect.pre(() => {
		journeys = data.journeys as JourneyWithDerived[];
	});
	let isCreating = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();

	function handleKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (
			event.key === '/' &&
			!(target instanceof HTMLInputElement) &&
			!(target instanceof HTMLTextAreaElement)
		) {
			event.preventDefault();
			searchInput?.focus();
		}
	}
	let mounted = $state(false);
	let search = $state('');
	type SortKey = 'recent' | 'name' | 'duration';
	let sort = $state<SortKey>('recent');
	type View = 'list' | 'grid';
	let view = $state<View>('list');

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

	function trackCreate() {
		isCreating = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isCreating = false;
		};
	}
</script>

<svelte:head><title>Travel Planner</title></svelte:head>

<svelte:window onkeydown={handleKeydown} />

<OfflineBanner />

<div class="travel-page pb-24 lg:pb-8">
	<main class="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
		<!-- masthead -->
		<div class="animate-glide-in flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="travel-display text-3xl leading-tight text-[#1b2b3a] sm:text-4xl">
					Travel Planner
				</h1>
			</div>
			<div class="flex items-center gap-2">
				<form method="POST" action="?/create" use:enhance={trackCreate}>
					<Button type="submit" size="sm" icon={IconAdd} loading={isCreating}>Blank journey</Button>
				</form>
			</div>
		</div>

		<JourneyPlanner />

		{#if journeys.length > 0}
			<div class="grid grid-cols-3 border-y border-[#1b2b3a]/20">
				<StatTile
					value={journeys.length}
					label={journeys.length === 1 ? 'Journey' : 'Journeys'}
					icon={IconHistory}
					delay={0}
				/>
				<StatTile value={totalStops} label="Stops" tone="secondary" icon={IconPin} delay={70} />
				<StatTile
					value={totalDuration > 0 ? formatDuration(totalDuration) : '—'}
					label="Planned time"
					tone="accent"
					icon={IconClock}
					delay={140}
				/>
			</div>
		{/if}

		{#if data.completedCount > 0}
			<a
				href="/journeys/completed"
				class="group flex items-center justify-between border border-l-4 border-[#1b2b3a]/20 border-l-[#2f7d58] bg-[#fffdf7] px-3.5 py-3 text-sm font-semibold text-[#1b2b3a] transition-all hover:-translate-y-px hover:shadow-[3px_4px_0_rgba(27,43,58,0.1)]"
			>
				<span class="flex items-center gap-2">
					<IconCheckCircle class="h-5 w-5 text-[#2f7d58]" /> Completed trips
				</span>
				<span
					class="text-xs font-medium text-[#a24e2c] transition-transform group-hover:translate-x-0.5"
				>
					{data.completedCount} archived →
				</span>
			</a>
		{/if}

		<!-- saved journeys -->
		<section aria-labelledby="saved-title">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 id="saved-title" class="travel-display text-xl text-[#1b2b3a]">Your journeys</h2>
				{#if journeys.length > 0}
					<span class="paper-eyebrow text-[9px]">{journeys.length} in the register</span>
				{/if}
			</div>

			{#if journeys.length === 0}
				<EmptyState
					icon={IconMap}
					accentIcon={IconAutoAwesome}
					title="No journeys yet"
					description="Plan your first trip above, or start with a blank journey and add stops yourself."
				>
					<form method="POST" action="?/create" use:enhance={trackCreate}>
						<Button type="submit" icon={IconAdd} loading={isCreating}>Create a journey</Button>
					</form>
				</EmptyState>
			{:else}
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<label
						class="flex min-w-[200px] flex-1 items-center gap-2 border border-[#1b2b3a]/25 bg-[#fffdf7] px-3 py-2 focus-within:border-[#a24e2c]"
					>
						<IconSearch class="h-4 w-4 shrink-0 text-[#a24e2c]" />
						<input
							bind:this={searchInput}
							class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#1b2b3a]/35"
							type="search"
							bind:value={search}
							placeholder="Search journeys or places…"
							aria-label="Search journeys"
						/>
						{#if search}
							<button
								class="text-[#1b2b3a]/40 hover:text-[#a24e2c]"
								aria-label="Clear search"
								onclick={() => (search = '')}
							>
								<IconClose class="h-4 w-4" />
							</button>
						{/if}
					</label>

					<div
						class="flex gap-px border border-[#1b2b3a]/30 bg-[#f4ecdc] p-px"
						role="radiogroup"
						aria-label="Sort journeys"
					>
						{#each sortOptions as option}
							<button
								type="button"
								role="radio"
								aria-checked={sort === option.value}
								class="px-2.5 py-1.5 text-[11px] font-bold transition-all {sort === option.value
									? 'animate-soft-pop bg-[#1b2b3a] text-[#fffdf7]'
									: 'text-[#1b2b3a]/55 hover:bg-[#c98a1f]/15'}"
								onclick={() => (sort = option.value)}>{option.label}</button
							>
						{/each}
					</div>

					<div
						class="flex gap-px border border-[#1b2b3a]/30 bg-[#f4ecdc] p-px"
						role="radiogroup"
						aria-label="View mode"
					>
						{#each [{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }] as option}
							<button
								type="button"
								role="radio"
								aria-checked={view === option.value}
								class="px-2.5 py-1.5 text-[11px] font-bold transition-all {view === option.value
									? 'animate-soft-pop bg-[#1b2b3a] text-[#fffdf7]'
									: 'text-[#1b2b3a]/55 hover:bg-[#c98a1f]/15'}"
								onclick={() => (view = option.value as View)}>{option.label}</button
							>
						{/each}
					</div>
				</div>

				{#if visibleJourneys.length > 0}
					<div class={view === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col gap-2.5'}>
						{#each visibleJourneys as journey, i (journey.id)}
							<div
								class:animate-fade-in-up={mounted}
								style={mounted ? `animation-delay: ${i * 45}ms` : ''}
							>
								<JourneyCard {journey} index={i} onclick={() => goto(`/journeys/${journey.id}`)} />
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="border border-dashed border-[#1b2b3a]/30 bg-[#fffdf7]/70 px-4 py-10 text-center"
					>
						<p class="travel-display text-lg text-[#1b2b3a]">No match in the register</p>
						<p class="mt-1 text-xs text-[#a24e2c]">Try another name or place.</p>
						<button class="btn btn-ghost btn-sm mt-3" onclick={() => (search = '')}
							>Clear search</button
						>
					</div>
				{/if}
			{/if}
		</section>
	</main>
</div>
