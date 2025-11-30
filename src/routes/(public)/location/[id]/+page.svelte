<!-- src/routes/locations/[id]/+page.svelte -->
<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import L from 'leaflet';
	import { categoryInfo, bestTimeInfo, type Category, type TravelLocation } from '$lib/types';
	import { goto } from '$app/navigation';
	import { formatDuration } from '$lib/utils/calculations';
	import { onMount } from 'svelte';

	// Import Fluent icons
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconEdit from '~icons/fluent/edit-24-regular';
	import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
	import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconCalendar from '~icons/fluent/calendar-24-regular';
	import IconGlobe from '~icons/fluent/globe-24-regular';
	import IconNavigation from '~icons/fluent/navigation-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-circle-24-regular';

	interface Props {
		data: {
			location: TravelLocation;
			submitted?: boolean;
		};
	}

	let { data }: Props = $props();
	let location = $state(data.location);
	let userHasLiked = $state(false);
	let userLikes = $state<Set<number>>(new Set());
	let mapInstance: L.Map | undefined = $state();

	// Load likes from localStorage
	onMount(() => {
		const savedLikes = localStorage.getItem('travel-likes');
		if (savedLikes) {
			userLikes = new Set(JSON.parse(savedLikes));
			userHasLiked = userLikes.has(location.id);
		}
	});

	function getCategoryIcon(category: Category) {
		const info = categoryInfo[category];
		return L.divIcon({
			html: `<div style="background-color: ${info.color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">${info.icon}</div>`,
			className: 'custom-marker',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
	}

	function toggleLike() {
		if (userHasLiked) {
			userLikes.delete(location.id);
			location.likes--;
		} else {
			userLikes.add(location.id);
			location.likes++;
		}
		userHasLiked = !userHasLiked;
		userLikes = new Set(userLikes); // Trigger reactivity
		localStorage.setItem('travel-likes', JSON.stringify(Array.from(userLikes)));
	}

	function editLocation() {
		goto(`/locations/${location.id}/edit`);
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
</script>

<div class="bg-base-200 min-h-screen">
	<!-- Header -->
	<div class="bg-primary text-primary-content p-4">
		<div class="container mx-auto flex items-center gap-4">
			<button class="btn btn-ghost btn-sm btn-circle" onclick={() => goto('/map')}>
				<IconArrowLeft class="h-5 w-5" />
			</button>
			<h1 class="text-xl font-bold">Location Details</h1>
		</div>
	</div>

	<div class="container mx-auto max-w-6xl p-4">
		{#if data.submitted}
			<div class="alert alert-success mb-6">
				<IconCheckmark class="h-5 w-5" />
				<span>Your edit has been submitted for review!</span>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Image -->
				{#if location.imageUrl}
					<div class="card bg-base-100 overflow-hidden shadow-xl">
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
											style="background-color: {categoryInfo[location.category]
												.color}; color: white;"
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
									<IconEdit class="h-4 w-4" />
									Suggest Edit
								</button>
							{/if}
						</div>

						<p class="text-base-content/80 mt-4 text-lg">{location.description}</p>

						<!-- Stats -->
						<div class="mt-6 flex flex-wrap gap-4">
							<div class="flex items-center gap-2">
								<IconClock class="h-5 w-5" />
								<span>{formatDuration(location.durationMinutes)} recommended</span>
							</div>

							{#if location.bestTimeToVisit}
								<div class="flex items-center gap-2">
									<IconCalendar class="h-5 w-5" />
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
						<div class="flex gap-3">
							<form
								method="POST"
								action="?/{userHasLiked ? 'unlike' : 'like'}"
								class="flex-1"
								use:enhance={() => {
									isLiking = true;
									return async ({ result, update }) => {
										isLiking = false;
										if (result.type === 'success') {
											location.likes += userHasLiked ? -1 : 1;
											userHasLiked = !userHasLiked;
										} else if (result.type === 'redirect') {
											goto(result.location);
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
										<IconThumbLikeFilled class="h-5 w-5" />
									{:else}
										<IconThumbLike class="h-5 w-5" />
									{/if}
									{location.likes} Likes
								</button>
							</form>
							<button class="btn btn-outline gap-2" onclick={openInMaps}>
								<IconNavigation class="h-5 w-5" />
								Directions
							</button>
						</div>

						<!-- Author Info -->
						<div class="text-base-content/60 mt-4 text-sm">
							Added by {location.userName} • {new Date(location.createdAt).toLocaleDateString()}
						</div>
					</div>
				</div>

				<!-- Google Maps Link -->
				{#if location.googleMapsUrl}
					<div class="card bg-base-100 shadow-xl">
						<div class="card-body">
							<h3 class="card-title">Additional Info</h3>
							<div class="flex items-center gap-3">
								<IconGlobe class="text-primary h-5 w-5" />
								<a
									href={location.googleMapsUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="link link-primary"
								>
									View on Google Maps
								</a>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Map Card -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-0">
						<div class="h-64">
							<Map
								options={{
									center: [location.latitude, location.longitude],
									zoom: 15,
									scrollWheelZoom: false
								}}
								class="h-full w-full rounded-2xl"
								bind:instance={mapInstance}
							>
								<TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
								<Marker
									latLng={[location.latitude, location.longitude]}
									icon={getCategoryIcon(location.category)}
								/>
							</Map>
						</div>
						<div class="p-4">
							<button class="btn btn-outline btn-sm w-full" onclick={openInMaps}>
								Open in Maps
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
