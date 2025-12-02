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
	import Modal from './Modal.svelte';

    // Define color classes for category badges
    const categoryColorClasses = (category: Category) => {
        const info = categoryInfo[category];
        // DaisyUI color names based on a standard dark/light theme (e.g., primary, secondary, accent)
        // Since we are using an inline style for color in the original, let's map to DaisyUI classes if possible, 
        // or keep the style for distinct color. We will use a fallback for now.
        switch (info.value) {
            case 'attraction': return 'badge-info';
            case 'food': return 'badge-warning';
            case 'accommodation': return 'badge-success';
            case 'transport': return 'badge-neutral';
            default: return 'badge-primary';
        }
    }

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

<div class="bg-base-100 border-base-300 flex w-96 flex-col overflow-hidden border-r shadow-2xl">
    <div class="bg-base-200 p-4 border-b border-base-300">
        <div class="mb-3 flex items-center gap-2">
            <IconMap class="h-6 w-6 text-primary" />
            <h1 class="text-xl font-bold text-base-content">Travel Planner</h1>
        </div>

        <div class="join w-full mb-3">
            <input
                type="text"
                placeholder="Search location..."
                class="input input-sm input-bordered join-item flex-grow"
                bind:value={searchQuery}
                onkeydown={(e) => e.key === 'Enter' && searchLocation()}
            />
            <button class="btn btn-sm btn-square join-item btn-primary" onclick={searchLocation}>
                <IconSearch class="size-5" />
            </button>
        </div>

        <div class="flex items-center gap-2 text-xs text-base-content/70">
            <IconPin class="size-4 text-secondary" />
            <span class="text-sm">Click map to add a new location tip.</span>
        </div>
    </div>

    <div class="bg-base-100 p-4 space-y-3 border-b border-base-300">
        <div class="join w-full">
            <button
                class="join-item btn btn-sm flex-1"
                class:btn-primary={!showTripPlanner}
                class:btn-outline={showTripPlanner}
                onclick={() => (showTripPlanner = false)}
            >
                <IconLocationIcon class="size-4" />
                Browse
            </button>
            <button
                class="join-item btn btn-sm flex-1"
                class:btn-primary={showTripPlanner}
                class:btn-outline={!showTripPlanner}
                onclick={() => (showTripPlanner = true)}
            >
                <IconNavigation class="size-4" />
                Trips ({trips.length})
            </button>
        </div>

        {#if !showTripPlanner}
            <div class="flex items-center gap-2">
                <IconFilter class="size-4 text-primary" />
                <span class="text-sm font-semibold">Filter Category:</span>
                <select class="select select-sm select-bordered flex-1" bind:value={selectedCategory}>
                    <option value="all">All Categories</option>
                    {#each Object.values(categoryInfo) as cat}
                        <option value={cat.value}>{cat.icon} {cat.label}</option>
                    {/each}
                </select>
            </div>
        {/if}
    </div>

    <div class="flex-1 overflow-y-auto">
        {#if showTripPlanner}
            <div class="p-4">
                {#if !currentTrip}
                    <div class="space-y-3">
                        <button
                            class="btn btn-primary btn-sm w-full gap-2"
                            onclick={() => (showNewTripDialog = true)}
                        >
                            <IconAdd class="size-5" />
                            Plan New Trip
                        </button>

                        {#if trips.length === 0}
                            <div class="text-base-content/50 py-8 text-center">
                                <IconNavigation class="mx-auto mb-2 size-12" />
                                <p class="text-sm">No trips planned yet.</p>
                                <p class="text-xs">Start by creating a new trip.</p>
                            </div>
                        {:else}
                            <div class="space-y-3">
                                <h3 class="text-sm font-semibold text-base-content/70">Saved Trips:</h3>
                                {#each trips as trip (trip.id)}
                                    <div class="card card-compact bg-base-200 shadow hover:shadow-lg transition-shadow border border-base-300">
                                        <div class="card-body p-4">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1">
                                                    <h3 class="font-bold text-base">{trip.name}</h3>
                                                    {#if trip.description}
                                                        <p class="text-base-content/70 text-sm line-clamp-1">{trip.description}</p>
                                                    {/if}
                                                    <div class="mt-2 flex items-center gap-3 text-xs text-base-content/70">
                                                        <div class="flex items-center gap-1">
                                                            <IconLocationIcon class="size-3" />
                                                            <span>{trip.stops.length} stops</span>
                                                        </div>
                                                        <div class="flex items-center gap-1">
                                                            <IconClock class="size-3" />
                                                            <span class="font-medium">{formatDuration(getTotalTripDuration(trip.stops, locationsMap))}</span>
                                                        </div>
                                                        {#if trip.startDate}
                                                            <div class="flex items-center gap-1">
                                                                <IconCalendar class="size-3" />
                                                                <span>{trip.startDate}</span>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                </div>
                                                <div class="flex gap-1 ml-4">
                                                    <button
                                                        class="btn btn-ghost btn-sm tooltip tooltip-left"
                                                        data-tip="Edit Trip"
                                                        onclick={() => selectTrip(trip)}
                                                    >
                                                        <IconEdit class="size-4" />
                                                    </button>
                                                    <button
                                                        class="btn btn-ghost btn-sm text-error tooltip tooltip-left"
                                                        data-tip="Delete Trip"
                                                        onclick={() => deleteTrip(trip.id)}
                                                    >
                                                        <IconDelete class="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-bold">{currentTrip.name}</h2>
                            <button class="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom" data-tip="Close Trip Editor" onclick={oncleartrip}>
                                <IconDismiss class="size-5" />
                            </button>
                        </div>

                        <div class="stats bg-base-200 w-full shadow-md border border-base-300">
                            <div class="stat p-3">
                                <div class="stat-title text-xs text-base-content/70">Stops</div>
                                <div class="stat-value text-xl">{currentTrip.stops.length}</div>
                            </div>
                            <div class="stat p-3">
                                <div class="stat-title text-xs text-base-content/70">Total Duration</div>
                                <div class="stat-value text-xl">{formatDuration(totalTravelTime())}</div>
                                <div class="stat-desc text-xs mt-1 text-base-content/60">
                                    <IconClock class="inline size-3 mr-1 align-bottom"/> {formatDuration(totalTripDuration)} at locations
                                </div>
                            </div>
                        </div>

                        {#if currentTripStops.length === 0}
                            <div role="alert" class="alert alert-info">
                                <IconLocationIcon class="size-5" />
                                <span class="text-sm">Browse the map to add locations to your trip.</span>
                            </div>
                        {:else}
                            <div class="join w-full">
                                <button
                                    class="join-item btn btn-sm flex-1"
                                    class:btn-primary={viewMode === 'list'}
                                    class:btn-outline={viewMode !== 'list'}
                                    onclick={() => viewMode = 'list'}
                                >
                                    List View
                                </button>
                                <button
                                    class="join-item btn btn-sm flex-1"
                                    class:btn-primary={viewMode === 'timeline'}
                                    class:btn-outline={viewMode !== 'timeline'}
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
                                        <div class="card card-compact bg-base-200 shadow-sm border border-base-300">
                                            <div class="card-body p-3">
                                                <div class="flex items-center gap-3">
                                                    <div class="badge badge-lg text-base-content" style="background-color: {categoryInfo[location.category].color}; color: white;">
                                                        <span class="text-xs font-bold">{index + 1}</span>
                                                    </div>
                                                    <div class="flex-1">
                                                        <h3 class="text-sm font-semibold">{location.title}</h3>
                                                        <div class="text-base-content/70 mt-0.5 flex items-center gap-2 text-xs">
                                                            <IconClock class="h-3 w-3" />
                                                            <span class="font-medium">{formatDuration(stop.customDuration || location.durationMinutes)}</span>
                                                            <button 
                                                                class="btn btn-ghost btn-xs btn-circle text-primary tooltip"
                                                                data-tip="Edit Duration"
                                                                onclick={() => oneditduration(location.id, stop.customDuration || location.durationMinutes)}
                                                            >
                                                                <IconEdit class="size-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button
                                                        class="btn btn-ghost btn-sm btn-circle text-error tooltip tooltip-left"
                                                        data-tip="Remove Stop"
                                                        onclick={() => removeFromTrip(location.id)}
                                                    >
                                                        <IconDismiss class="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {#if index < currentTripStops.length - 1 && stop.transport}
                                            <div role="alert" class="alert alert-info p-2 py-1 text-xs shadow-sm bg-base-300">
                                                <IconNavigation class="size-4" />
                                                <span class="text-base-content">
                                                    Travel: **{formatDuration(stop.transport.durationMinutes)}** by **{stop.transport.mode}**
                                                </span>
                                                <button 
                                                    class="btn btn-ghost btn-xs btn-circle text-primary tooltip ml-auto"
                                                    data-tip="Edit Transport"
                                                    onclick={() => onedittransport(index, location.title, currentTripStops[index + 1].location?.title || '')}
                                                >
                                                    <IconEdit class="size-3" />
                                                </button>
                                            </div>
                                        {/if}

                                    {/each}
                                </div>
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>
        {:else}
            <div class="space-y-3 p-4">
                {#if filteredLocations.length === 0}
                    <div class="text-base-content/50 py-8 text-center">
                        <IconMap class="mx-auto mb-2 size-12" />
                        <p>No locations found matching the filter.</p>
                    </div>
                {:else}
                    {#each filteredLocations as location (location.id)}
                        <div
                            class="card card-compact bg-base-200 cursor-pointer shadow-md transition-shadow hover:shadow-xl border border-base-300"
                            onclick={() => handleLocationClick(location)}
                        >
                            <div class="card-body p-4">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="badge badge-lg {categoryColorClasses(location.category)} min-w-10 flex-shrink-0">
                                        <span class="text-lg">{categoryInfo[location.category].icon}</span>
                                    </div>
                                    
                                    <div class="flex-1 min-w-0">
                                        <h3 class="card-title text-base line-clamp-1">{location.title}</h3>
                                        <p class="text-base-content/70 line-clamp-2 text-sm mt-0.5">
                                            {location.description}
                                        </p>
                                        {#if location.address}
                                            <p class="text-base-content/60 mt-1 text-xs line-clamp-1">{location.address}</p>
                                        {/if}
                                    </div>
                                </div>

                                <div class="mt-2 flex items-center justify-between border-t border-base-300 pt-2">
                                    <div class="flex items-center gap-3 text-sm text-base-content/70">
                                        <div class="flex items-center gap-1">
                                            <IconClock class="size-4 text-primary" />
                                            <span class="font-medium">{formatDuration(location.durationMinutes)}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1 text-sm text-base-content/70">
                                        {#if userLikes.has(location.id)}
                                            <IconThumbLikeFilled class="text-error size-4" />
                                        {:else}
                                            <IconThumbLike class="size-4" />
                                        {/if}
                                        <span class="font-medium">{location.likes}</span>
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


   <Modal bind:open={showNewTripDialog} title="Create New Trip">
      

            <div class="space-y-4">
                <div class="form-control">
                    <label class="label"><span class="label-text font-semibold">Trip Name *</span></label>
                    <input
                        type="text"
                        class="input input-bordered input-primary"
                        bind:value={newTripName}
                        placeholder="e.g., Weekend in Rome"
                    />
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text font-semibold">Description</span></label>
                    <textarea
                        class="textarea textarea-bordered h-20"
                        bind:value={newTripDescription}
                        placeholder="Optional: A brief outline of your plan..."
                    ></textarea>
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text font-semibold">Start Time</span></label>
                    <div class="flex items-center gap-2">
                         <IconClock class="size-5 text-secondary" />
                        <input
                            type="time"
                            class="input input-bordered flex-1"
                            bind:value={newTripStartTime}
                        />
                    </div>
                </div>

                <div class="modal-action flex gap-3 mt-6">
                    <button class="btn btn-ghost flex-1" onclick={() => (showNewTripDialog = false)}>
                        Cancel
                    </button>
                    <button
                        class="btn btn-primary flex-1"
                        onclick={handleCreateTrip}
                        disabled={!newTripName.trim()}
                    >
                        <IconSave class="size-5" />
                        Create Trip
                    </button>
                </div>
            </div>
     
        
    </Modal>
