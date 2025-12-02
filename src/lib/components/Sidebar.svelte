<!-- src/lib/components/Sidebar.svelte -->
<script lang="ts">
    import type { Category, TravelTip, Trip, TripStop } from '$lib/types';
    import { categoryInfo } from '$lib/types';
    import { formatDuration, getTotalTripDuration } from '$lib/utils/calculations';
    import TripTimeline from './TripTimeline.svelte';
    import IconSearch from '~icons/fluent/search-24-regular';
    import IconMap from '~icons/fluent/map-24-regular';
    import IconPin from '~icons/fluent/pin-24-filled';
    import IconFilter from '~icons/fluent/filter-24-regular';
    import IconLocationIcon from '~icons/fluent/location-24-regular';
    import IconNavigation from '~icons/fluent/navigation-24-regular';
    import IconAdd from '~icons/fluent/add-24-regular';
    import IconEdit from '~icons/fluent/edit-24-regular';
    import IconDelete from '~icons/fluent/delete-24-regular';
    import IconDismiss from '~icons/fluent/dismiss-24-regular';
    import IconClock from '~icons/fluent/clock-24-regular';
    import IconThumbLike from '~icons/fluent/thumb-like-24-regular';
    import IconThumbLikeFilled from '~icons/fluent/thumb-like-24-filled';
    import IconSave from '~icons/fluent/save-24-regular';
    import IconCalendar from '~icons/fluent/calendar-24-regular';

    interface Props {
        searchQuery: string;
        selectedCategory: Category | 'all';
        showTripPlanner: boolean;
        filteredLocations: TravelTip[];
        trips: Trip[];
        currentTrip: Trip | null;
        currentTripStops: (TripStop & { location?: TravelTip })[];
        locationsMap: Map<number, TravelTip>;
        userLikes: Set<number>;
        searchLocation: () => void;
        handleLocationClick: (location: TravelTip) => void;
        createTrip: (name: string, description: string, startTime?: string) => void;
        selectTrip: (trip: Trip) => void;
        deleteTrip: (tripId: string) => void;
        removeFromTrip: (tipId: number) => void;
        updateStopDuration: (tipId: number, duration: number) => void;
        updateStopTransport: (stopIndex: number, transport: any) => void;
        oncleartrip: () => void;
        oneditduration: (tipId: number, currentDuration: number) => void;
        onedittransport: (stopIndex: number, fromLocation: string, toLocation: string) => void;
    }

    let {
        searchQuery = $bindable(),
        selectedCategory = $bindable(),
        showTripPlanner = $bindable(),
        filteredLocations,
        trips,
        currentTrip,
        currentTripStops,
        locationsMap,
        userLikes,
        searchLocation,
        handleLocationClick,
        createTrip,
        selectTrip,
        deleteTrip,
        removeFromTrip,
        oncleartrip,
        oneditduration,
        onedittransport
    }: Props = $props();

    let showNewTripDialog = $state(false);
    let newTripName = $state('');
    let newTripDescription = $state('');
    let newTripStartTime = $state('09:00');
    let viewMode = $state<'list' | 'timeline'>('list');

    function handleCreateTrip() {
        if (!newTripName.trim()) return;
        createTrip(newTripName, newTripDescription, newTripStartTime);
        newTripName = '';
        newTripDescription = '';
        newTripStartTime = '09:00';
        showNewTripDialog = false;
    }

    const totalTripDuration = $derived(
        currentTrip ? getTotalTripDuration(currentTrip.stops, locationsMap) : 0
    );

    // Calculate total travel time including transport
    const totalTravelTime = $derived(() => {
        if (!currentTrip) return 0;
        const stayTime = getTotalTripDuration(currentTrip.stops, locationsMap);
        const transportTime = currentTrip.stops.reduce((acc, stop) => {
            return acc + (stop.transport?.durationMinutes || 0);
        }, 0);
        return stayTime + transportTime;
    });
</script>

<div class="bg-base-200 border-base-300 flex w-96 flex-col overflow-hidden border-r">
    <!-- Header -->
    <div class="bg-primary text-primary-content p-4">
        <div class="mb-4 flex items-center gap-2">
            <IconMap class="h-6 w-6" />
            <h1 class="text-xl font-bold">Travel Locations</h1>
        </div>

        <!-- Search -->
        <div class="flex gap-2">
            <input
                type="text"
                placeholder="Search location..."
                class="input input-sm text-base-content flex-1"
                bind:value={searchQuery}
                onkeydown={(e) => e.key === 'Enter' && searchLocation()}
            />
            <button class="btn btn-sm btn-square" onclick={searchLocation}>
                <IconSearch class="size-5" />
            </button>
        </div>

        <div class="alert alert-sm bg-primary-focus text-primary-content mt-3 border-0">
            <IconPin class="size-4" />
            <span class="text-xs">Click anywhere on map to add new location</span>
        </div>
    </div>

    <!-- Category Filter & Trip Toggle -->
    <div class="bg-base-100 border-base-300 space-y-3 border-b p-4">
        <div>
            <div class="mb-2 flex items-center gap-2">
                <IconFilter class="size-4" />
                <span class="text-sm font-medium">Category</span>
            </div>
            <select class="select select-sm select-bordered w-full" bind:value={selectedCategory}>
                <option value="all">All Categories</option>
                {#each Object.values(categoryInfo) as cat}
                    <option value={cat.value}>{cat.icon} {cat.label}</option>
                {/each}
            </select>
        </div>

        <div class="flex gap-2">
            <button
                class="btn btn-sm flex-1"
                class:btn-primary={!showTripPlanner}
                onclick={() => (showTripPlanner = false)}
            >
                <IconLocationIcon class="size-4" />
                Browse
            </button>
            <button
                class="btn btn-sm flex-1"
                class:btn-primary={showTripPlanner}
                onclick={() => (showTripPlanner = true)}
            >
                <IconNavigation class="size-4" />
                Trips ({trips.length})
            </button>
        </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
        {#if showTripPlanner}
            <!-- Trip Planner -->
            <div class="p-4">
                {#if !currentTrip}
                    <!-- Trip Selection -->
                    <div class="space-y-3">
                        <button
                            class="btn btn-primary btn-sm w-full gap-2"
                            onclick={() => (showNewTripDialog = true)}
                        >
                            <IconAdd class="size-5" />
                            New Trip
                        </button>

                        {#if trips.length === 0}
                            <div class="text-base-content/60 py-8 text-center">
                                <IconNavigation class="mx-auto mb-2 size-12 opacity-50" />
                                <p class="text-sm">No trips yet</p>
                                <p class="text-xs">Create a trip to start planning</p>
                            </div>
                        {:else}
                            {#each trips as trip (trip.id)}
                                <div class="card bg-base-100 shadow">
                                    <div class="card-body p-4">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <h3 class="font-bold">{trip.name}</h3>
                                                {#if trip.description}
                                                    <p class="text-base-content/70 text-sm">{trip.description}</p>
                                                {/if}
                                                {#if trip.startDate}
                                                    <div class="text-base-content/60 mt-1 flex items-center gap-1 text-xs">
                                                        <IconCalendar class="size-3" />
                                                        <span>{trip.startDate}</span>
                                                    </div>
                                                {/if}
                                                <div class="text-base-content/60 mt-2 flex items-center gap-3 text-xs">
                                                    <span>{trip.stops.length} stops</span>
                                                    <span>{formatDuration(getTotalTripDuration(trip.stops, locationsMap))}</span>
                                                </div>
                                            </div>
                                            <div class="flex gap-1">
                                                <button
                                                    class="btn btn-ghost btn-xs btn-square"
                                                    onclick={() => selectTrip(trip)}
                                                >
                                                    <IconEdit class="size-4" />
                                                </button>
                                                <button
                                                    class="btn btn-ghost btn-xs btn-square text-error"
                                                    onclick={() => deleteTrip(trip.id)}
                                                >
                                                    <IconDelete class="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                {:else}
                    <!-- Current Trip Editor -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-bold">{currentTrip.name}</h2>
                            <button class="btn btn-ghost btn-sm btn-square" onclick={oncleartrip}>
                                <IconDismiss class="size-5" />
                            </button>
                        </div>

                        <div class="stats stats-vertical bg-base-100 w-full shadow">
                            <div class="stat p-3">
                                <div class="stat-title text-xs">Stops</div>
                                <div class="stat-value text-2xl">{currentTrip.stops.length}</div>
                            </div>
                            <div class="stat p-3">
                                <div class="stat-title text-xs">Total Time</div>
                                <div class="stat-value text-2xl">{formatDuration(totalTravelTime())}</div>
                                <div class="stat-desc text-xs">
                                    {formatDuration(totalTripDuration)} at locations
                                </div>
                            </div>
                        </div>

                        {#if currentTripStops.length === 0}
                            <div class="alert">
                                <IconLocationIcon class="size-5" />
                                <span class="text-sm">Tap locations to add them to your trip</span>
                            </div>
                        {:else}
                            <!-- View Toggle -->
                            <div class="flex gap-2">
                                <button
                                    class="btn btn-sm flex-1"
                                    class:btn-primary={viewMode === 'list'}
                                    onclick={() => viewMode = 'list'}
                                >
                                    List
                                </button>
                                <button
                                    class="btn btn-sm flex-1"
                                    class:btn-primary={viewMode === 'timeline'}
                                    onclick={() => viewMode = 'timeline'}
                                >
                                    <IconClock class="size-4" />
                                    Timeline
                                </button>
                            </div>

                            {#if viewMode === 'timeline'}
                                <TripTimeline
                                    stops={currentTripStops}
                                    startTime={currentTrip.startDate || '09:00'}
                                    oneditduration={oneditduration}
                                    onedittransport={onedittransport}
                                    onremove={removeFromTrip}
                                />
                            {:else}
                                <div class="space-y-2">
                                    {#each currentTripStops as stop, index (stop.tipId)}
                                        {@const location = stop.location!}
                                        <div class="card bg-base-100 shadow">
                                            <div class="card-body p-3">
                                                <div class="flex items-start gap-3">
                                                    <div
                                                        class="badge badge-lg"
                                                        style="background-color: {categoryInfo[location.category].color}; color: white;"
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <div class="flex-1">
                                                        <h3 class="text-sm font-semibold">{location.title}</h3>
                                                        <div class="text-base-content/70 mt-1 flex items-center gap-2 text-xs">
                                                            <IconClock class="h-3 w-3" />
                                                            <span>{formatDuration(stop.customDuration || location.durationMinutes)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        class="btn btn-ghost btn-xs btn-square"
                                                        onclick={() => removeFromTrip(location.id)}
                                                    >
                                                        <IconDismiss class="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>
        {:else}
            <!-- Locations List -->
            <div class="space-y-3 p-4">
                {#if filteredLocations.length === 0}
                    <div class="text-base-content/60 py-8 text-center">
                        <IconMap class="mx-auto mb-2 size-12 opacity-50" />
                        <p>No locations found</p>
                    </div>
                {:else}
                    {#each filteredLocations as location (location.id)}
                        <div
                            class="card bg-base-100 cursor-pointer shadow transition-shadow hover:shadow-lg"
                            onclick={() => handleLocationClick(location)}
                        >
                            <div class="card-body p-4">
                                {#if location.imageUrl}
                                    <figure class="-m-4 mb-3">
                                        <img
                                            src={location.imageUrl}
                                            alt={location.title}
                                            class="h-32 w-full object-cover"
                                        />
                                    </figure>
                                {/if}

                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex-1">
                                        <div class="mb-1 flex items-center gap-2">
                                            <span class="text-lg">{categoryInfo[location.category].icon}</span>
                                            <h3 class="card-title text-base">{location.title}</h3>
                                        </div>
                                        <p class="text-base-content/70 line-clamp-2 text-sm">
                                            {location.description}
                                        </p>
                                        {#if location.address}
                                            <p class="text-base-content/60 mt-1 text-xs">{location.address}</p>
                                        {/if}
                                    </div>
                                </div>

                                <div class="mt-2 flex items-center gap-3">
                                    <div class="flex items-center gap-1">
                                        <IconClock class="size-4" />
                                        <span class="text-sm">{formatDuration(location.durationMinutes)}</span>
                                    </div>
                                    <div class="ml-auto flex items-center gap-1">
                                        {#if userLikes.has(location.id)}
                                            <IconThumbLikeFilled class="text-primary size-4" />
                                        {:else}
                                            <IconThumbLike class="size-4" />
                                        {/if}
                                        <span class="text-sm">{location.likes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<!-- New Trip Dialog -->
{#if showNewTripDialog}
    <div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
        <div class="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-bold">New Trip</h2>
                <button class="btn btn-ghost btn-sm btn-circle" onclick={() => (showNewTripDialog = false)}>
                    <IconDismiss class="size-5" />
                </button>
            </div>

            <div class="space-y-4">
                <div class="form-control">
                    <label class="label"><span class="label-text">Trip Name *</span></label>
                    <input
                        type="text"
                        class="input input-bordered"
                        bind:value={newTripName}
                        placeholder="Weekend in Paris"
                    />
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Description</span></label>
                    <textarea
                        class="textarea textarea-bordered"
                        bind:value={newTripDescription}
                        placeholder="Optional description..."
                    ></textarea>
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Start Time</span></label>
                    <input
                        type="time"
                        class="input input-bordered"
                        bind:value={newTripStartTime}
                    />
                </div>

                <div class="flex gap-3">
                    <button class="btn btn-ghost flex-1" onclick={() => (showNewTripDialog = false)}>
                        Cancel
                    </button>
                    <button
                        class="btn btn-primary flex-1"
                        onclick={handleCreateTrip}
                        disabled={!newTripName.trim()}
                    >
                        <IconSave class="size-4" />
                        Create
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}