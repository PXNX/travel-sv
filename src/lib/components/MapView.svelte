<!-- src/lib/components/MapComponent.svelte -->
<script lang="ts">
    import { Map, TileLayer, Marker, Polyline } from 'sveaflet';
    import L from 'leaflet';
    import type { Category, TravelTip, Trip } from '$lib/types';
    import { categoryInfo } from '$lib/types';

    interface Props {
        mapCenter: [number, number];
        mapZoom: number;
        filteredLocations: TravelTip[];
        currentTrip: Trip | null;
        routeCoordinates: [number, number][];
        mapInstance?: L.Map;
        onmarkerclick: (location: TravelTip) => void;
        allLocations: TravelTip[]; // All locations for proximity check
    }

    let {
        mapCenter,
        mapZoom,
        filteredLocations,
        currentTrip,
        routeCoordinates,
        mapInstance = $bindable(),
        onmarkerclick,
        allLocations
    }: Props = $props();

    // Confirmation dialog state
    let showConfirmDialog = $state(false);
    let pendingLat = $state(0);
    let pendingLng = $state(0);

    // Store marker instances and track if marker was clicked
    let markerInstances: Record<number, L.Marker> = {};
    let markerClickedRecently = false;

    // Calculate distance between two coordinates in meters
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    // Check if any location is within 15m
    function hasNearbyLocation(lat: number, lng: number): boolean {
        return allLocations.some((location) => {
            const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
            return distance <= 15;
        });
    }

    // Handle map click with proximity check
    function onMapClick(e: L.LeafletMouseEvent) {
        // If a marker was just clicked, ignore this map click
        if (markerClickedRecently) {
            markerClickedRecently = false;
            return;
        }

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Check if there's a location nearby
        if (hasNearbyLocation(lat, lng)) {
            // Location exists nearby, do nothing
            return;
        }

        // No nearby location, show confirmation
        pendingLat = lat;
        pendingLng = lng;
        showConfirmDialog = true;
    }

    function confirmAddLocation() {
        showConfirmDialog = false;
        // Navigate to new location page
        window.location.href = `/location/new?lat=${pendingLat}&lng=${pendingLng}`;
    }

    function cancelAddLocation() {
        showConfirmDialog = false;
    }

    // Attach map click handler and marker click handlers
    $effect(() => {
        if (mapInstance) {
            mapInstance.on('click', onMapClick);

            // Add click handlers to all markers
            Object.entries(markerInstances).forEach(([locationId, marker]) => {
                if (marker) {
                    marker.on('click', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        markerClickedRecently = true;
                        const location = filteredLocations.find(loc => loc.id === parseInt(locationId));
                        if (location) {
                            onmarkerclick(location);
                        }
                    });
                }
            });

            return () => {
                mapInstance.off('click', onMapClick);
                Object.values(markerInstances).forEach(marker => {
                    if (marker) {
                        marker.off('click');
                    }
                });
            };
        }
    });

    // Get trip order for a location
    function getTripOrder(locationId: number): number | null {
        if (!currentTrip) return null;
        const index = currentTrip.stops.findIndex((s) => s.tipId === locationId);
        return index !== -1 ? index + 1 : null;
    }

    // Get duration for a location (custom or default)
    function getDuration(locationId: number): number {
        const location = filteredLocations.find((l) => l.id === locationId);
        if (!location) return 60;

        if (currentTrip) {
            const stop = currentTrip.stops.find((s) => s.tipId === locationId);
            // Check if customDuration exists and is a valid number
            if (stop && typeof stop.customDuration === 'number') {
                return stop.customDuration;
            }
        }

        return location.durationMinutes;
    }

    // Custom marker icon by category
    function getCategoryIcon(category: Category, locationId: number) {
        const info = categoryInfo[category];
        const tripOrder = getTripOrder(locationId);
        const duration = getDuration(locationId);

        if (tripOrder !== null) {
            // Trip marker with order number and duration
            return L.divIcon({
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
                        <div style="background-color: ${info.color}; min-width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white;">
                            ${tripOrder}
                        </div>
                        <div style="background-color: rgba(0,0,0,0.75); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                            ${duration} min
                        </div>
                    </div>
                `,
                className: 'custom-marker-trip',
                iconSize: [48, 70],
                iconAnchor: [24, 70]
            });
        } else {
            // Regular marker
            return L.divIcon({
                html: `<div style="background-color: ${info.color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer;">${info.icon}</div>`,
                className: 'custom-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
        }
    }
</script>

<div class="relative flex-1">
    <Map
        options={{ center: mapCenter, zoom: mapZoom, minZoom: 2, maxZoom: 18 }}
        class="h-full w-full"
        bind:instance={mapInstance}
    >
        <TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />

        <!-- Route polyline -->
        {#if currentTrip && routeCoordinates.length > 1}
            <Polyline
                latLngs={routeCoordinates}
                options={{
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }}
            />
        {/if}

        <!-- Markers -->
        {#each filteredLocations as location (location.id)}
            <Marker
                latLng={[location.latitude, location.longitude]}
                icon={getCategoryIcon(location.category, location.id)}
                bind:instance={markerInstances[location.id]}
            />
        {/each}
    </Map>

    <!-- Confirmation Dialog -->
    {#if showConfirmDialog}
        <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onclick={cancelAddLocation}>
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
                <h3 class="text-lg font-bold mb-3">Add New Location?</h3>
                <p class="text-gray-600 mb-6">Do you want to add a new travel tip at this location?</p>
                
                <div class="flex gap-3 justify-end">
                    <button onclick={cancelAddLocation} class="btn btn-ghost">
                        Cancel
                    </button>
                    <button onclick={confirmAddLocation} class="btn btn-primary">
                        Add Location
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>