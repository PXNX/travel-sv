<script lang="ts">
	// Planning first: pick a start and a destination, set a time, plan the trip.
	// Coordinates come from the shared map-based location picker; the server
	// creates the journey and computes the connecting segment.
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/ui';
	import IconPin from '~icons/material-symbols/location-on-rounded';
	import IconFlag from '~icons/material-symbols/flag-rounded';
	import IconSwap from '~icons/material-symbols/swap-vert-rounded';
	import IconCalendar from '~icons/material-symbols/calendar-today-rounded';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconArrowForward from '~icons/material-symbols/arrow-forward-rounded';

	interface Place {
		name: string;
		lat: number;
		lon: number;
	}

	let submitting = $state(false);

	function submittingPlan() {
		submitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			submitting = false;
		};
	}

	let from = $state<Place | null>(null);
	let to = $state<Place | null>(null);
	let startDatetime = $state('');
	let showPicker = $state(false);
	let picking: 'from' | 'to' = $state('from');

	function openPicker(field: 'from' | 'to') {
		picking = field;
		showPicker = true;
	}

	function confirmPlace(place: Place) {
		if (picking === 'from') from = place;
		else to = place;
		showPicker = false;
	}

	function swap() {
		[from, to] = [to, from];
	}

	const ready = $derived(!!from && !!to);
</script>

<section class="paper-sheet animate-unfold overflow-hidden" aria-labelledby="planner-title">
	<div
		class="flex items-center justify-between gap-3 border-b border-[#1b2b3a]/15 bg-[#f4ecdc]/50 px-4 py-3 sm:px-5"
	>
		<div>
			<p class="paper-eyebrow text-[9px]">Plan a journey</p>
			<h2
				id="planner-title"
				class="travel-display text-xl leading-tight text-[#1b2b3a] sm:text-2xl"
			>
				Where are you heading?
			</h2>
		</div>
		<span
			class="hidden h-10 w-10 shrink-0 items-center justify-center border border-[#a24e2c]/30 bg-[#fffdf7] text-[#a24e2c] sm:flex"
		>
			<IconTrain class="h-5 w-5" />
		</span>
	</div>

	<form
		method="POST"
		action="?/plan"
		use:enhance={submittingPlan}
		class="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:gap-2 sm:p-5"
	>
		<input type="hidden" name="fromName" value={from?.name ?? ''} />
		<input type="hidden" name="fromLat" value={from?.lat ?? ''} />
		<input type="hidden" name="fromLon" value={from?.lon ?? ''} />
		<input type="hidden" name="toName" value={to?.name ?? ''} />
		<input type="hidden" name="toLat" value={to?.lat ?? ''} />
		<input type="hidden" name="toLon" value={to?.lon ?? ''} />
		<input type="hidden" name="startDatetime" value={startDatetime} />

		<label class="block">
			<span class="paper-eyebrow mb-1 block text-[9px]">From</span>
			<button
				type="button"
				class="flex w-full items-center gap-2 border border-[#1b2b3a]/30 bg-[#fffdf7] px-3 py-3 text-left transition-colors hover:border-[#c98a1f]"
				onclick={() => openPicker('from')}
			>
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2f7d58] text-white"
					><IconPin class="h-3.5 w-3.5" /></span
				>
				<span
					class="truncate text-sm font-semibold {from ? 'text-[#1b2b3a]' : 'text-[#1b2b3a]/40'}"
				>
					{from?.name ?? 'Choose a starting point'}
				</span>
			</button>
		</label>

		<div class="flex justify-center sm:pb-2.5">
			<button
				type="button"
				class="flex h-9 w-9 items-center justify-center border border-[#1b2b3a]/25 bg-[#f4ecdc] text-[#a24e2c] transition-colors hover:border-[#c98a1f] hover:bg-[#c98a1f]/15"
				aria-label="Swap start and destination"
				title="Swap"
				onclick={swap}
			>
				<IconSwap class="h-4 w-4" />
			</button>
		</div>

		<label class="block">
			<span class="paper-eyebrow mb-1 block text-[9px]">To</span>
			<button
				type="button"
				class="flex w-full items-center gap-2 border border-[#1b2b3a]/30 bg-[#fffdf7] px-3 py-3 text-left transition-colors hover:border-[#c98a1f]"
				onclick={() => openPicker('to')}
			>
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#b23b2e] text-white"
					><IconFlag class="h-3.5 w-3.5" /></span
				>
				<span class="truncate text-sm font-semibold {to ? 'text-[#1b2b3a]' : 'text-[#1b2b3a]/40'}">
					{to?.name ?? 'Choose a destination'}
				</span>
			</button>
		</label>

		<div class="flex flex-col gap-3 sm:col-span-3 sm:flex-row sm:items-end">
			<label class="flex-1">
				<span class="paper-eyebrow mb-1 block text-[9px]"
					>Departure <span class="tracking-normal normal-case">(optional)</span></span
				>
				<span class="flex items-center gap-2 border border-[#1b2b3a]/30 bg-[#fffdf7] px-3 py-2.5">
					<IconCalendar class="h-4 w-4 shrink-0 text-[#a24e2c]" />
					<input
						type="datetime-local"
						bind:value={startDatetime}
						class="min-w-0 flex-1 bg-transparent text-sm outline-none"
						aria-label="Departure date and time"
					/>
				</span>
			</label>

			<Button
				type="submit"
				size="lg"
				icon={IconArrowForward}
				disabled={!ready || submitting}
				loading={submitting}
				class="sm:min-w-48"
			>
				{submitting ? 'Planning…' : 'Plan journey'}
			</Button>
		</div>
	</form>

	{#if !ready}
		<p class="border-t border-[#1b2b3a]/10 px-4 py-2 text-[11px] text-[#1b2b3a]/45 sm:px-5">
			Pick a start and a destination to plan your route.
		</p>
	{/if}
</section>

{#if browser && showPicker}
	{#await import('$lib/maps/LocationPicker.svelte') then { default: LocationPicker }}
		<LocationPicker
			bind:open={showPicker}
			initialLat={picking === 'from' ? (from?.lat ?? 50.9) : (to?.lat ?? 50.9)}
			initialLon={picking === 'from' ? (from?.lon ?? 10.3) : (to?.lon ?? 10.3)}
			onconfirm={confirmPlace}
		/>
	{/await}
{/if}
