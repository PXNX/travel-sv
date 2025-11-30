<!-- src/routes/location/[id]/+page.svelte -->
<script lang="ts">
	import { categoryInfo, bestTimeInfo, type Category, type TravelLocation } from '$lib/types';
	import { goto } from '$app/navigation';
	import { formatDuration } from '$lib/utils/calculations';
	import { enhance } from '$app/forms';

	// Import Fluent icons
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
	import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconNavigation from '~icons/fluent/navigation-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';
	import IconMap from '~icons/fluent/map-24-regular';
	import IconAdd from '~icons/fluent/add-24-regular';
	import { resolve } from '$app/paths';

	interface Props {
		data: {
			location: TravelLocation;
			submitted?: boolean;
			isSignedIn?: boolean;
			userTrips?: Array<{
				id: number;
				name: string;
				locationCount: number;
				hasLocation: boolean;
			}>;
		};
	}

	let { data }: Props = $props();
	let location = $state(data.location);
	let userHasLiked = $state(false);
	let isLiking = $state(false);
	let showTripModal = $state(false);

	// Action handlers
	function editLocation() {
		goto(resolve(`/location/${location.id}/edit`));
	}

	function openInMaps() {
		if (location.googleMapsUrl) {
			window.open(location.googleMapsUrl, '_blank');
		} else {
			window.open(
				`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
				'_blank'
			);
		}
	}

	function viewOnMap() {
		goto(resolve(`/?highlight=${location.id}`));
	}

	function openTripModal() {
		showTripModal = true;
	}

	function closeTripModal() {
		showTripModal = false;
	}

	async function toggleTripLocation(tripId: number, add: boolean) {
		const formData = new FormData();
		formData.append('tripId', tripId.toString());
		formData.append('locationId', location.id.toString());

		const response = await fetch(`?/${add ? 'addToTrip' : 'removeFromTrip'}`, {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			// Update the trip's hasLocation status
			if (data.userTrips) {
				const trip = data.userTrips.find((t) => t.id === tripId);
				if (trip) {
					trip.hasLocation = add;
					trip.locationCount += add ? 1 : -1;
				}
			}
		}
	}
</script>

<div class="bg-base-200 min-h-screen">
	<!-- Header -->
	<div class="bg-primary text-primary-content p-4">
		<div class="container mx-auto flex items-center gap-4">
			<button class="btn btn-ghost btn-sm btn-circle" onclick={() => goto(resolve('/'))}>
				<IconArrowLeft class="size-5" />
			</button>
			<h1 class="text-xl font-bold">Location Details</h1>
		</div>
	</div>

	<div class="container mx-auto max-w-4xl p-4">
		{#if data.submitted}
			<div class="alert alert-success mb-6">
				<IconCheckmark class="size-5" />
				<span>Your edit has been submitted for review!</span>
			</div>
		{/if}

		<!-- Image -->
		{#if location.imageUrl}
			<div class="card bg-base-100 mb-6 overflow-hidden shadow-xl">
				<figure>
					<img src={location.imageUrl} alt={location.title} class="h-96 w-full object-cover" />
				</figure>
			</div>
		{/if}

		<!-- Main Info Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="mb-2 flex items-center gap-3">
							<span class="text-3xl">{categoryInfo[location.category].icon}</span>
							<div>
								<h2 class="card-title text-2xl">{location.title}</h2>
								<div
									class="badge"
									style="background-color: {categoryInfo[location.category].color}; color: white;"
								>
									{categoryInfo[location.category].label}
								</div>
							</div>
						</div>
						{#if location.address}
							<p class="text-base-content/60 text-sm">{location.address}</p>
						{/if}
					</div>
					{#if data.isSignedIn}
						<button class="btn btn-primary btn-sm gap-2" onclick={editLocation}>
							<IconEdit class="size-4" />
							Suggest Edit
						</button>
					{/if}
				</div>

				<p class="text-base-content/80 mt-4 text-lg">{location.description}</p>

				<!-- Stats -->
				<div class="mt-6 flex flex-wrap gap-4">
					<div class="flex items-center gap-2">
						<IconClock class="size-5" />
						<span>{formatDuration(location.durationMinutes)} recommended</span>
					</div>

					{#if location.bestTimeToVisit}
						<div class="flex items-center gap-2">
							<IconCalendar class="size-5" />
							<span class="capitalize"
								>Best time: {bestTimeInfo[location.bestTimeToVisit].label}</span
							>
						</div>
					{/if}
				</div>

				<!-- Tags -->
				{#if location.tags && location.tags.length > 0}
					<div class="divider"></div>
					<div class="flex flex-wrap gap-2">
						{#each location.tags as tag}
							<span class="badge badge-outline">{tag}</span>
						{/each}
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="divider"></div>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<!-- Like Button -->
					<form
						method="POST"
						action="?/{userHasLiked ? 'unlike' : 'like'}"
						use:enhance={() => {
							isLiking = true;
							return async ({ result, update }) => {
								isLiking = false;
								if (result.type === 'success') {
									location.likes += userHasLiked ? -1 : 1;
									userHasLiked = !userHasLiked;
								} else if (result.type === 'redirect') {
									goto(resolve(result.location));
								}
								await update();
							};
						}}
					>
						<button
							type="submit"
							class="btn btn-outline w-full gap-2"
							class:btn-primary={userHasLiked}
							disabled={isLiking}
						>
							{#if userHasLiked}
								<IconThumbLikeFilled class="size-5" />
							{:else}
								<IconThumbLike class="size-5" />
							{/if}
							{location.likes} Likes
						</button>
					</form>

					<!-- Directions Button -->
					<button class="btn btn-outline gap-2" onclick={openInMaps}>
						<IconNavigation class="size-5" />
						Directions
					</button>

					<!-- View on Map Button -->
					<button class="btn btn-outline gap-2" onclick={viewOnMap}>
						<IconMap class="size-5" />
						View on Map
					</button>

					<!-- Add to Trip Button -->
					<button class="btn btn-primary gap-2" onclick={openTripModal}>
						<IconAdd class="size-5" />
						Add to Trip
					</button>
				</div>

				<!-- Author Info -->
				<div class="text-base-content/60 mt-4 text-sm">
					Added by {location.userName} • {new Date(location.createdAt).toLocaleDateString()}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Trip Modal -->
{#if showTripModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md">
			<h3 class="text-lg font-bold">Manage Trips</h3>
			<p class="text-base-content/70 py-2 text-sm">Add or remove this location from your trips</p>

			<div class="divider my-2"></div>

			<div class="max-h-96 space-y-2 overflow-y-auto">
				<!-- Create New Trip Button -->
				<button
					class="btn btn-primary w-full justify-start gap-2"
					onclick={() => goto(resolve(`/location/${location.id}/new-trip`))}
				>
					<IconAdd class="size-5" />
					Create New Trip with This Location
				</button>

				<div class="divider my-2">Your Trips</div>

				<!-- List of User's Trips -->
				{#if data.userTrips && data.userTrips.length > 0}
					{#each data.userTrips as trip}
						<label
							class="border-base-300 hover:bg-base-200 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
						>
							<input
								type="checkbox"
								class="checkbox checkbox-primary"
								checked={trip.hasLocation}
								onchange={() => toggleTripLocation(trip.id, !trip.hasLocation)}
							/>
							<div class="flex-1">
								<div class="font-medium">{trip.name}</div>
								<div class="text-base-content/60 text-xs">
									{trip.locationCount} location{trip.locationCount !== 1 ? 's' : ''}
								</div>
							</div>
						</label>
					{/each}
				{:else}
					<div class="text-base-content/60 py-8 text-center">
						<p class="mb-3">You don't have any trips yet</p>
						<p class="text-sm">Create your first trip to start planning!</p>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn" onclick={closeTripModal}>Done</button>
			</div>
		</div>
		<div class="modal-backdrop" onclick={closeTripModal}></div>
	</div>
{/if}
