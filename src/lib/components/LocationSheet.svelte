<script lang="ts">
	import type { TravelTip, Trip } from '$lib/types';
	import { categoryInfo } from '$lib/types';
	import { formatDuration } from '$lib/utils/calculations';
	import { goto } from '$app/navigation';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
	import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
	import FluentList24Regular from '~icons/fluent/list-24-regular';

	interface Props {
		show: boolean;
		location: TravelTip | null;
		userLikes: Set<number>;
		currentTrip: Trip | null;
		isInCurrentTrip: (tipId: number) => boolean;
		toggleLike: (locationId: number) => void;
		addToTrip: (location: TravelTip) => void;
		oncreatenewtip: () => void;
	}

	let {
		show = $bindable(),
		location,
		userLikes,
		currentTrip,
		isInCurrentTrip,
		toggleLike,
		addToTrip,
		oncreatenewtip
	}: Props = $props();

	function close() {
		show = false;
	}

	function viewLocationDetail(locationId: number) {
		goto(`/location/${locationId}`);
	}

	function handleAddToTrip() {
		if (location) {
			addToTrip(location);
			close();
		}
	}
</script>

{#if show && location}
	<div class="fixed inset-0 z-[2000] bg-black/50" onclick={close}></div>
	<div
		class="bg-base-100 animate-slide-up fixed right-0 bottom-0 left-0 z-[2001] rounded-t-3xl shadow-2xl"
	>
		<div class="container mx-auto max-w-2xl">
			<!-- Drag Handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="bg-base-300 h-1 w-12 rounded-full"></div>
			</div>

			<div class="max-h-[70vh] overflow-y-auto p-6">
				<!-- Image -->
				{#if location.imageUrl}
					<img
						src={location.imageUrl}
						alt={location.title}
						class="mb-4 h-48 w-full rounded-2xl object-cover"
					/>
				{/if}

				<!-- Title and Category -->
				<div class="mb-4 flex items-start gap-3">
					<span class="text-4xl">{categoryInfo[location.category].icon}</span>
					<div class="flex-1">
						<h2 class="text-2xl font-bold">{location.title}</h2>
						<div
							class="badge mt-1"
							style="background-color: {categoryInfo[location.category].color}; color: white;"
						>
							{categoryInfo[location.category].label}
						</div>
					</div>
				</div>

				<!-- Stats -->
				<div class="mb-4 flex items-center gap-4">
					<div class="flex items-center gap-2">
						<IconClock class="size-5" />
						<span class="font-medium">{formatDuration(location.durationMinutes)}</span>
					</div>
					<button class="flex items-center gap-2" onclick={() => toggleLike(location.id)}>
						{#if userLikes.has(location.id)}
							<IconThumbLikeFilled class="text-primary size-5" />
						{:else}
							<IconThumbLike class="size-5" />
						{/if}
						<span class="font-medium">{location.likes}</span>
					</button>
				</div>

				<!-- Description -->
				<p class="text-base-content/80 mb-6">{location.description}</p>

				<!-- Actions -->
				<div class="flex gap-3">
					<button class="btn btn-primary flex-1" onclick={() => viewLocationDetail(location.id)}>
						View Details
					</button>
					{#if currentTrip}
						{#if isInCurrentTrip(location.id)}
							<button class="btn btn-outline flex-1 gap-2" disabled>
								<FluentList24Regular class="size-5" />
								In Trip
							</button>
						{:else}
							<button class="btn btn-outline flex-1 gap-2" onclick={handleAddToTrip}>
								<FluentList24Regular class="size-5" />
								Add to Trip
							</button>
						{/if}
					{:else}
						<button class="btn btn-outline flex-1 gap-2" onclick={oncreatenewtip}>
							<FluentList24Regular class="size-5" />
							Add to Trip
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
