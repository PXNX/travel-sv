<!-- src/lib/components/TransportEditor.svelte -->
<!--
	Transport Editor Component
	
	Handles transportation planning between locations.
	
	IMPORTANT: Transport duration should include:
	1. Walking time from departure location to station
	2. Waiting time at station
	3. Travel time on train/bus
	4. Walking time from arrival station to destination
	
	The connection search API only provides #2-3, so when displaying
	connections to users, remember that actual travel time will be longer.
-->
<script lang="ts">
	import type { TransportSegment, TransportMode } from '$lib/types';
	import { transportInfo } from '$lib/types';
	import { getWalkingRoute, calculateWalkingDuration } from '$lib/utils/routing';
	import {
		findNearbyStations,
		searchConnections,
		formatDistance,
		formatDuration,
		formatTime,
		getDistanceInMeters,
		type Station,
		type Connection
	} from '$lib/services/stationService';
	import { loadTransportSettings } from '$lib/stores/transportSettings';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconSwap from '~icons/fluent/arrow-swap-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';
	import IconRefresh from '~icons/fluent/arrow-clockwise-24-regular';
	import IconSettings from '~icons/fluent/settings-24-regular';
	import IconWalking from '~icons/fluent/person-walking-24-regular';
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		transport: TransportSegment | null;
		fromLocation: string;
		toLocation: string;
		fromCoords?: [number, number];
		toCoords?: [number, number];
		suggestedDepartureTime?: Date;
		onsave: (transport: TransportSegment) => void;
		oncancel: () => void;
		onopensettings?: () => void;
	}

	let {
		show = $bindable(),
		transport,
		fromLocation,
		toLocation,
		fromCoords,
		toCoords,
		suggestedDepartureTime,
		onsave,
		onopensettings
	}: Props = $props();

	// Load settings
	let settings = $state(loadTransportSettings());

	// Form state
	let mode = $state<TransportMode>('railway');
	let departureTime = $state('');
	let arrivalTime = $state('');
	let durationMinutes = $state(30);
	let routeName = $state('');
	let notes = $state('');

	// Station search state
	let fromStations = $state<Station[]>([]);
	let toStations = $state<Station[]>([]);
	let selectedFromStation = $state<Station | null>(null);
	let selectedToStation = $state<Station | null>(null);
	let isLoadingFromStations = $state(false);
	let isLoadingToStations = $state(false);

	// Connection search state
	let connections = $state<Connection[]>([]);
	let allConnections = $state<Connection[]>([]); // Unfiltered connections
	let isLoadingConnections = $state(false);
	let selectedConnection = $state<Connection | null>(null);

	// Walking calculation state
	let isCalculatingWalking = $state(false);
	let walkingDistanceMeters = $state<number | undefined>(undefined);

	// Walking times to/from stations (in minutes)
	let walkingTimeToFromStation = $state(0);
	let walkingTimeToToStation = $state(0);

	// UI state
	let showManualEntry = $state(false);

	/**
	 * Initialize form when dialog opens
	 */
	$effect(() => {
		if (show) {
			initializeForm();
			// Reload settings when dialog opens
			settings = loadTransportSettings();
		}
	});

	/**
	 * Auto-search stations when coordinates are available
	 */
	$effect(() => {
		if (show && mode !== 'walking' && fromCoords && fromStations.length === 0 && !isLoadingFromStations) {
			loadFromStations();
		}
	});

	$effect(() => {
		if (show && mode !== 'walking' && toCoords && toStations.length === 0 && !isLoadingToStations) {
			loadToStations();
		}
	});

	/**
	 * Re-filter connections when max transfer time setting changes
	 * (min transfer time is handled by API)
	 */
	$effect(() => {
		if (allConnections.length > 0) {
			connections = filterConnectionsByMaxTransferTime(allConnections);
		}
	});

	/**
	 * Auto-calculate walking time when mode is walking
	 */
	$effect(() => {
		if (mode === 'walking' && fromCoords && toCoords && show && durationMinutes === 30) {
			calculateWalkingTime();
		}
	});

	/**
	 * Initialize form with existing transport data or defaults
	 */
	function initializeForm() {
		if (transport) {
			mode = transport.mode;
			departureTime = transport.departureTime || '';
			arrivalTime = transport.arrivalTime || '';
			durationMinutes = transport.durationMinutes;
			routeName = transport.routeName || '';
			notes = transport.notes || '';
			showManualEntry = true;
		} else {
			resetForm();
			if (suggestedDepartureTime) {
				departureTime = suggestedDepartureTime.toTimeString().slice(0, 5);
			}
		}
	}

	/**
	 * Reset form to defaults
	 */
	function resetForm() {
		mode = 'railway';
		departureTime = '';
		arrivalTime = '';
		durationMinutes = 30;
		routeName = '';
		notes = '';
		fromStations = [];
		toStations = [];
		connections = [];
		allConnections = [];
		selectedFromStation = null;
		selectedToStation = null;
		selectedConnection = null;
		showManualEntry = false;
		isLoadingFromStations = false;
		isLoadingToStations = false;
		isLoadingConnections = false;
		isCalculatingWalking = false;
	}

	/**
	 * Load nearby stations for departure location
	 */
	async function loadFromStations() {
		if (!fromCoords || isLoadingFromStations) return;

		isLoadingFromStations = true;
		try {
			fromStations = await findNearbyStations(fromCoords);
			if (fromStations.length > 0 && !selectedFromStation) {
				selectedFromStation = fromStations[0];
			}
		} catch (error) {
			console.error('Error loading from stations:', error);
		} finally {
			isLoadingFromStations = false;
		}
	}

	/**
	 * Load nearby stations for arrival location
	 */
	async function loadToStations() {
		if (!toCoords || isLoadingToStations) return;

		isLoadingToStations = true;
		try {
			toStations = await findNearbyStations(toCoords);
			if (toStations.length > 0 && !selectedToStation) {
				selectedToStation = toStations[0];
			}
		} catch (error) {
			console.error('Error loading to stations:', error);
		} finally {
			isLoadingToStations = false;
		}
	}

	/**
	 * Filter connections by max transfer time (client-side only)
	 * Min transfer time is handled by the API via transferTime parameter
	 */
	function filterConnectionsByMaxTransferTime(conns: Connection[]): Connection[] {
		if (settings.maxTransferTime >= 999) {
			// No max limit, return all
			return conns;
		}

		return conns.filter((conn, index) => {
			// No transfers = no need to check
			if (conn.transfers === 0) return true;

			// Check each transfer time
			for (let i = 0; i < conn.legs.length - 1; i++) {
				const currentLeg = conn.legs[i];
				const nextLeg = conn.legs[i + 1];
				
				// Skip walking legs in transfer calculation
				if (nextLeg.mode === 'walking') continue;
				if (!currentLeg.line) continue; // Skip if current leg is walking
				
				const transferTime = (nextLeg.departure.getTime() - currentLeg.arrival.getTime()) / 1000 / 60;
				
				// Check max transfer time
				if (transferTime > settings.maxTransferTime) {
					console.log(`Connection ${index + 1} filtered: Transfer time ${transferTime.toFixed(1)}min exceeds max ${settings.maxTransferTime}min`);
					return false;
				}
			}

			console.log(`Connection ${index + 1} passed max transfer time filter`);
			return true;
		});
	}

	/**
	 * Search for connections between selected stations
	 * 
	 * The suggestedDepartureTime is calculated based on the timeline:
	 * - It accounts for all previous locations and their stay times
	 * - Example: If you finish at Location A at 10:15, we need to:
	 *   1. Add walking time from location to station (e.g., 5min)
	 *   2. Search for connections departing at 10:20 or later from the station
	 */
	async function loadConnections() {
		if (!selectedFromStation || !selectedToStation || isLoadingConnections) return;

		isLoadingConnections = true;
		try {
			// Determine departure time for search
			let searchTime: Date | undefined;
			if (suggestedDepartureTime) {
				// Add walking time to station to get actual departure time from station
				const actualStationDepartureTime = new Date(suggestedDepartureTime);
				actualStationDepartureTime.setMinutes(
					actualStationDepartureTime.getMinutes() + walkingTimeToFromStation
				);
				searchTime = actualStationDepartureTime;
				console.log(
					`Departure from location: ${formatTime(suggestedDepartureTime)}, ` +
					`Walking ${walkingTimeToFromStation}min to station, ` +
					`Searching connections from: ${formatTime(actualStationDepartureTime)}`
				);
			} else if (departureTime) {
				searchTime = parseDepartureTime(departureTime);
			}
			// If no time specified, searchTime remains undefined (API will use current time)

			// Search for connections with settings
			// Note: minTransferTime is applied at API level, maxTransferTime is client-side filtered
			allConnections = await searchConnections(
				selectedFromStation,
				selectedToStation,
				searchTime,
				settings.maxConnections,
				{
					deutschlandTicketOnly: settings.deutschlandTicketOnly,
					minTransferTime: settings.minTransferTime,
					maxTransferTime: settings.maxTransferTime
				}
			);

			console.log(`Found ${allConnections.length} connections from API (min transfer time ${settings.minTransferTime}min applied)`);
			connections = filterConnectionsByMaxTransferTime(allConnections);
			console.log(`${connections.length} connections after applying max transfer time filter (${settings.maxTransferTime}min)`);
		} catch (error) {
			console.error('Error loading connections:', error);
			connections = [];
			allConnections = [];
		} finally {
			isLoadingConnections = false;
		}
	}

	/**
	 * Parse time string (HH:MM) into a Date for today
	 */
	function parseDepartureTime(timeStr: string): Date {
		const [hours, minutes] = timeStr.split(':').map(Number);
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
		return date;
	}

	/**
	 * Select a departure station and calculate walking time from location
	 */
	function selectFromStation(station: Station) {
		selectedFromStation = station;
		
		// Calculate walking time from departure location to this station
		if (fromCoords) {
			const distanceMeters = getDistanceInMeters(
				fromCoords[0],
				fromCoords[1],
				station.lat,
				station.lon
			);
			// Assume walking speed of 5 km/h = 83.33 m/min
			walkingTimeToFromStation = Math.ceil(distanceMeters / 83.33);
			console.log(`Walking time to departure station: ${walkingTimeToFromStation}min (${distanceMeters}m)`);
		}
		
		connections = [];
		allConnections = [];
		if (selectedToStation) {
			loadConnections();
		}
	}

	/**
	 * Select an arrival station and calculate walking time to location
	 */
	function selectToStation(station: Station) {
		selectedToStation = station;
		
		// Calculate walking time from this station to arrival location
		if (toCoords) {
			const distanceMeters = getDistanceInMeters(
				station.lat,
				station.lon,
				toCoords[0],
				toCoords[1]
			);
			// Assume walking speed of 5 km/h = 83.33 m/min
			walkingTimeToToStation = Math.ceil(distanceMeters / 83.33);
			console.log(`Walking time from arrival station: ${walkingTimeToToStation}min (${distanceMeters}m)`);
		}
		
		connections = [];
		allConnections = [];
		if (selectedFromStation) {
			loadConnections();
		}
	}

	/**
	 * Select a connection and populate form
	 * The total duration includes walking to/from stations plus the transit time
	 */
	function selectConnectionOption(connection: Connection) {
		selectedConnection = connection;

		const primaryLeg = connection.legs.find((leg) => leg.line) || connection.legs[0];
		mode = primaryLeg.mode;

		departureTime = formatTime(connection.departure);
		arrivalTime = formatTime(connection.arrival);
		
		// Duration includes: walking to station + transport + walking from station
		const transportDurationMinutes = Math.round(connection.duration / 60);
		durationMinutes = transportDurationMinutes + walkingTimeToFromStation + walkingTimeToToStation;

		const lines = connection.legs
			.filter((leg) => leg.line)
			.map((leg) => leg.line)
			.join(' → ');
		routeName = lines || '';

		// Clear notes - we'll use proper fields instead
		notes = connection.transfers === 0 ? 'Direct connection' : '';

		console.log('Selected connection:', connection);
		console.log(`Total duration: ${durationMinutes}min (transport: ${transportDurationMinutes}min + walking: ${walkingTimeToFromStation + walkingTimeToToStation}min)`);
		showManualEntry = true;
	}

	/**
	 * Calculate walking duration
	 */
	async function calculateWalkingTime() {
		if (!fromCoords || !toCoords) return;

		isCalculatingWalking = true;
		try {
			const route = await getWalkingRoute(fromCoords, toCoords);

			if (route) {
				durationMinutes = route.duration;
				walkingDistanceMeters = route.distance;
				const distanceKm = (route.distance / 1000).toFixed(2);
				notes = '';
				console.log(`Walking route: ${distanceKm} km, ${durationMinutes} min`);
			} else {
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				// Use straight-line distance as fallback
				walkingDistanceMeters = getDistanceInMeters(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
				notes = 'Approximate (straight-line distance)';
			}
		} catch (error) {
			console.error('Error calculating walking time:', error);
			const duration = calculateWalkingDuration(fromCoords, toCoords);
			durationMinutes = duration;
			// Use straight-line distance as fallback
			walkingDistanceMeters = getDistanceInMeters(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
			notes = 'Approximate (straight-line distance)';
		} finally {
			isCalculatingWalking = false;
		}
	}

	/**
	 * Update duration when times change
	 */
	function updateDuration() {
		if (departureTime && arrivalTime) {
			const [depHour, depMin] = departureTime.split(':').map(Number);
			const [arrHour, arrMin] = arrivalTime.split(':').map(Number);

			let totalMinutes = arrHour * 60 + arrMin - (depHour * 60 + depMin);
			if (totalMinutes < 0) totalMinutes += 24 * 60;

			durationMinutes = totalMinutes;
		}
	}

	/**
	 * Extract route coordinates from selected connection
	 */
	function extractRouteCoordinates(): [number, number][] | undefined {
		if (!selectedConnection) return undefined;

		const allCoordinates: [number, number][] = [];

		// Process each leg of the journey
		for (const leg of selectedConnection.legs) {
			// Skip walking legs
			if (!leg.line) continue;

			// Try to use polyline data if available (most detailed)
			if (leg.polyline?.features && leg.polyline.features.length > 0) {
				console.log('Found polyline data for leg');
				for (const feature of leg.polyline.features) {
					if (feature.geometry?.coordinates) {
						// Polyline coordinates are in [lng, lat] format, convert to [lat, lng]
						const coords = feature.geometry.coordinates.map(
							(coord: number[]) => [coord[1], coord[0]] as [number, number]
						);
						console.log(`Added ${coords.length} polyline points`);
						allCoordinates.push(...coords);
					}
				}
			} else if (leg.stopovers && leg.stopovers.length > 0) {
				// Use stopover locations to create route through stations
				console.log(`Found ${leg.stopovers.length} stopovers for leg`);
				
				// Get origin coordinates from the leg
				// We need to make another API call or use fromCoords/toCoords
				// For now, just use stopovers
				for (const stopover of leg.stopovers) {
					if (stopover.stop?.location) {
						allCoordinates.push([
							stopover.stop.location.latitude,
							stopover.stop.location.longitude
						]);
					}
				}
			}
		}

		if (allCoordinates.length > 0) {
			console.log(`Extracted ${allCoordinates.length} route coordinates from connection`);
			return allCoordinates;
		}

		return undefined;
	}

	/**
	 * Save transportation details
	 */
	function handleSave() {
		const routeCoordinates = extractRouteCoordinates();
		
		// Calculate distance from connection or walking route
		let distanceKm: number | undefined;
		if (selectedConnection) {
			// Sum distances from all legs
			distanceKm = selectedConnection.legs.reduce((sum, leg) => {
				return sum + (leg.distance || 0);
			}, 0) / 1000; // Convert meters to km
		} else if (mode === 'walking' && walkingDistanceMeters !== undefined) {
			// Use the actual walking route distance that was calculated
			distanceKm = walkingDistanceMeters / 1000;
		} else if (mode === 'walking' && fromCoords && toCoords) {
			// Fallback to straight-line distance if no route was calculated
			const distanceMeters = getDistanceInMeters(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
			distanceKm = distanceMeters / 1000;
		}
		
		onsave({
			mode,
			departureTime: departureTime || undefined,
			arrivalTime: arrivalTime || undefined,
			durationMinutes,
			routeName: mode === 'walking' ? undefined : (routeName || undefined),
			notes: notes || undefined,
			distanceKm: distanceKm ? Number(distanceKm.toFixed(1)) : undefined,
			transfers: selectedConnection?.transfers,
			walkingTimeMinutes: (walkingTimeToFromStation + walkingTimeToToStation) || undefined,
			routeCoordinates
		});
	}

	/**
	 * Get icon for station type
	 */
	function getStationIcon(station: Station) {
		if (station.type === 'railway') return transportInfo.railway.icon;
		if (station.type === 'bus') return transportInfo.bus.icon;
		return IconLocation;
	}

	/**
	 * Get badge color for station type
	 */
	function getStationBadgeClass(station: Station) {
		if (station.type === 'railway') return 'badge-primary';
		if (station.type === 'bus') return 'badge-warning';
		return 'badge-info';
	}

	/**
	 * Get importance badge class
	 */
	function getImportanceBadgeClass(importance: number): string {
		if (importance >= 80) return 'badge-error';
		if (importance >= 60) return 'badge-warning';
		if (importance >= 40) return 'badge-info';
		return 'badge-ghost';
	}

	/**
	 * Get importance label
	 */
	function getImportanceLabel(importance: number): string {
		if (importance >= 80) return 'Major Hub';
		if (importance >= 60) return 'Important';
		if (importance >= 40) return 'Regional';
		return 'Local';
	}

	/**
	 * Get transfer time details for a connection
	 */
	function getTransferInfo(connection: Connection): string {
		if (connection.transfers === 0) return 'Direct';
		
		const transferTimes: number[] = [];
		for (let i = 0; i < connection.legs.length - 1; i++) {
			const currentLeg = connection.legs[i];
			const nextLeg = connection.legs[i + 1];
			if (nextLeg.mode !== 'walking') {
				const transferTime = Math.round((nextLeg.departure.getTime() - currentLeg.arrival.getTime()) / 1000 / 60);
				transferTimes.push(transferTime);
			}
		}
		
		if (transferTimes.length === 0) return `${connection.transfers} transfer${connection.transfers > 1 ? 's' : ''}`;
		
		const minTransfer = Math.min(...transferTimes);
		const maxTransfer = Math.max(...transferTimes);
		if (minTransfer === maxTransfer) {
			return `${connection.transfers} transfer${connection.transfers > 1 ? 's' : ''} (${minTransfer} min)`;
		}
		return `${connection.transfers} transfer${connection.transfers > 1 ? 's' : ''} (${minTransfer}-${maxTransfer} min)`;
	}

	/**
	 * Check if connection matches Deutschland ticket
	 */
	function isDeutschlandTicket(connection: Connection): boolean {
		return connection.legs.every(leg => {
			if (leg.mode === 'walking' || leg.mode === 'bus') return true;
			if (!leg.line) return true;
			
			const line = leg.line.toUpperCase();
			return !line.includes('ICE') && 
			       !line.includes('IC ') && 
			       !line.startsWith('IC') &&
			       !line.includes('EC ');
		});
	}
</script>

<Modal bind:open={show} title="Transportation Details">
	<div class="space-y-4">
		<!-- Header with Settings Link -->
		<div class="flex items-center justify-between">
			<div class="form-control">
				<label class="label"><span class="label-text font-medium">Transport Mode</span></label>
			</div>

		</div>

		<!-- Transport Mode Selection -->
		<div class="grid grid-cols-3 gap-2">
			{#each Object.values(transportInfo) as info}
				<button
					class="btn btn-sm"
					class:btn-primary={mode === info.value}
					onclick={() => {
						mode = info.value;
						connections = [];
						allConnections = [];
						selectedConnection = null;
						showManualEntry = mode === 'walking';
						if (mode !== 'walking') {
							if (fromCoords && fromStations.length === 0) loadFromStations();
							if (toCoords && toStations.length === 0) loadToStations();
						}
					}}
				>
					<info.icon class="size-4" />
					{info.label}
				</button>
			{/each}
		</div>

		{#if mode === 'walking'}
			<!-- Walking Mode -->
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-sm font-semibold flex items-center gap-2">
							<IconWalking class="size-5" />
							Walking Route
						</h3>
						{#if isCalculatingWalking}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							<button
								class="btn btn-xs btn-ghost"
								onclick={calculateWalkingTime}
								disabled={!fromCoords || !toCoords}
							>
								<IconRefresh class="size-3" />
								Calculate
							</button>
						{/if}
					</div>

					<div class="text-base-content/70 text-xs space-y-2">
						<div class="flex items-start gap-2">
							<IconLocation class="size-4 mt-0.5 flex-shrink-0" />
							<span class="font-medium">{fromLocation}</span>
						</div>
						{#if durationMinutes}
							<div class="ml-6 text-base-content/50">
								~{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
							</div>
						{/if}
						<div class="flex items-start gap-2">
							<IconLocation class="size-4 mt-0.5 flex-shrink-0" />
							<span class="font-medium">{toLocation}</span>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Public Transport Mode -->
			<div class="space-y-3">
				<!-- Station Selection -->
				<div class="grid grid-cols-2 gap-3">
					<!-- From Station -->
					<div>
						<label class="label pb-1">
							<span class="label-text text-xs font-semibold">From</span>
							{#if isLoadingFromStations}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
						</label>
						<div class="text-xs text-base-content/60 mb-2">{fromLocation}</div>

						{#if fromStations.length > 0}
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each fromStations.slice(0, 5) as station}
									<button
										class="w-full text-left p-2 rounded-lg border transition-colors"
										class:border-primary={selectedFromStation?.id === station.id}
										class:bg-primary={selectedFromStation?.id === station.id}
										class:bg-opacity-10={selectedFromStation?.id === station.id}
										class:border-base-300={selectedFromStation?.id !== station.id}
										class:hover:border-primary={selectedFromStation?.id !== station.id}
										onclick={() => selectFromStation(station)}
									>
										<div class="flex items-start justify-between gap-2 mb-1">
											<span class="font-medium text-sm">{station.name}</span>
											<span class="badge {getImportanceBadgeClass(station.importance)} badge-xs">
												{getImportanceLabel(station.importance)}
											</span>
										</div>
										<div class="flex items-center gap-2 text-xs text-base-content/60">
											<span class="badge {getStationBadgeClass(station)} badge-xs">
												{station.type}
											</span>
											<span>{formatDistance(station.distance)}</span>
										</div>
									</button>
								{/each}
							</div>
						{:else if !isLoadingFromStations}
							<div class="alert alert-warning py-1 text-xs">
								No stations nearby
							</div>
						{/if}
					</div>

					<!-- To Station -->
					<div>
						<label class="label pb-1">
							<span class="label-text text-xs font-semibold">To</span>
							{#if isLoadingToStations}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
						</label>
						<div class="text-xs text-base-content/60 mb-2">{toLocation}</div>

						{#if toStations.length > 0}
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each toStations.slice(0, 5) as station}
									<button
										class="w-full text-left p-2 rounded-lg border transition-colors"
										class:border-primary={selectedToStation?.id === station.id}
										class:bg-primary={selectedToStation?.id === station.id}
										class:bg-opacity-10={selectedToStation?.id === station.id}
										class:border-base-300={selectedToStation?.id !== station.id}
										class:hover:border-primary={selectedToStation?.id !== station.id}
										onclick={() => selectToStation(station)}
									>
										<div class="flex items-start justify-between gap-2 mb-1">
											<span class="font-medium text-sm">{station.name}</span>
											<span class="badge {getImportanceBadgeClass(station.importance)} badge-xs">
												{getImportanceLabel(station.importance)}
											</span>
										</div>
										<div class="flex items-center gap-2 text-xs text-base-content/60">
											<span class="badge {getStationBadgeClass(station)} badge-xs">
												{station.type}
											</span>
											<span>{formatDistance(station.distance)}</span>
										</div>
									</button>
								{/each}
							</div>
						{:else if !isLoadingToStations}
							<div class="alert alert-warning py-1 text-xs">
								No stations nearby
							</div>
						{/if}
					</div>
				</div>

				<!-- Connection Results -->
				{#if selectedFromStation && selectedToStation}
					<div class="divider my-2"></div>

					{#if isLoadingConnections}
						<div class="flex items-center justify-center gap-2 py-4">
							<span class="loading loading-spinner loading-sm"></span>
							<span class="text-sm">Searching connections...</span>
						</div>
					{:else if connections.length > 0}
						<div>
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-base-content">Available Connections</h3>
								<span class="badge badge-ghost badge-sm">{connections.length} found</span>
							</div>
							
							<div class="max-h-96 space-y-2.5 overflow-y-auto pr-1">
								{#each connections as connection}
									{@const primaryLeg = connection.legs.find((leg) => leg.line) || connection.legs[0]}
									{@const isRegional = isDeutschlandTicket(connection)}
									<button
										class="group relative w-full text-left transition-all duration-200 ease-in-out rounded-xl border-2 bg-base-100 hover:shadow-lg hover:scale-[1.02]"
										class:border-primary={selectedConnection === connection}
										class:bg-primary-5={selectedConnection === connection}
										class:shadow-md={selectedConnection === connection}
										class:border-base-300={selectedConnection !== connection}
										class:hover:border-primary-50={selectedConnection !== connection}
										onclick={() => selectConnectionOption(connection)}
									>
										<div class="p-4">
											<!-- Time and Duration Header -->
											<div class="flex items-center justify-between mb-3">
												<div class="flex items-center gap-3">
													<IconClock class="size-5 text-primary opacity-70" />
													<div>
														<div class="font-bold text-base text-base-content">
															{formatTime(connection.departure)} → {formatTime(connection.arrival)}
														</div>
														<div class="text-xs text-base-content/60 font-medium mt-0.5">
															{formatDuration(connection.duration)}
														</div>
													</div>
												</div>
												{#if primaryLeg.line}
													<span class="badge badge-primary badge-lg font-semibold px-3">
														{primaryLeg.line}
													</span>
												{/if}
											</div>

											<!-- Connection Info -->
											<div class="flex items-center gap-2 flex-wrap">
												{#if connection.transfers === 0}
													<span class="badge badge-success badge-sm gap-1">
														<svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
															<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
														</svg>
														Direct
													</span>
												{:else}
													<span class="badge badge-info badge-sm gap-1">
														<IconSwap class="size-3" />
														{getTransferInfo(connection)}
													</span>
												{/if}
											</div>
										</div>
										
										<!-- Selected indicator -->
										{#if selectedConnection === connection}
											<div class="absolute top-3 right-3 size-6 bg-primary rounded-full flex items-center justify-center">
												<svg class="size-4 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
												</svg>
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>

						<button
							class="btn btn-sm btn-ghost btn-block"
							onclick={() => (showManualEntry = !showManualEntry)}
						>
							{showManualEntry ? 'Hide' : 'Show'} Manual Entry
						</button>
					{:else}
						<div class="space-y-2">
							<div class="alert alert-warning py-2">
								<div class="text-xs">
									<div class="font-semibold mb-1">No connections found</div>
									{#if allConnections.length > 0}
										<div>Found {allConnections.length} connection(s), but they were filtered out by transfer time requirements.</div>
										{#if settings.minTransferTime > 0}
											<div class="mt-1">• Minimum transfer time: {settings.minTransferTime} min</div>
										{/if}
										{#if settings.maxTransferTime < 120}
											<div>• Maximum transfer time: {settings.maxTransferTime} min</div>
										{/if}
										<div class="mt-2">
											{#if onopensettings}
									<button class="link text-xs" onclick={onopensettings}>Adjust transfer time settings</button>
								{/if}
										</div>
									{:else}
										<div>No connections available between these stations at this time.</div>
										{#if settings.deutschlandTicketOnly}
											<div class="mt-1 text-base-content/60">Searching for regional trains only (Deutschland Ticket mode).</div>
											<div class="mt-1">
												{#if onopensettings}
										<button class="link text-xs" onclick={onopensettings}>Disable Deutschland Ticket mode</button> to see IC/ICE trains.
									{/if}
											</div>
										{:else}
											<div class="mt-1 text-base-content/60">There might be no direct route, or services may be limited at this time.</div>
										{/if}
									{/if}
								</div>
							</div>
							<button
								class="btn btn-sm btn-ghost btn-block"
								onclick={() => (showManualEntry = true)}
							>
								Enter Manually
							</button>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Manual Entry Section -->
		{#if showManualEntry || mode === 'walking'}
			<div class="space-y-3">
				{#if mode !== 'walking'}
					<div class="divider my-1 text-xs">Connection Details</div>
				{/if}

				<!-- Duration (Read-only display) -->
				<div class="form-control">
					<label class="label py-1">
						<span class="label-text text-xs">Duration</span>
					</label>
					<div class="input input-bordered input-sm bg-base-200 flex items-center">
						<span class="text-base-content">
							{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
						</span>
					</div>
				</div>

				<!-- Route Name -->
				{#if mode !== 'walking'}
					<div class="form-control">
						<label class="label py-1">
							<span class="label-text text-xs">
								{mode === 'railway' ? 'Train Line' : 'Bus Route'}
							</span>
						</label>
						<input
							type="text"
							class="input input-bordered input-sm"
							bind:value={routeName}
							placeholder={mode === 'railway' ? 'e.g., RE7, RB14' : 'e.g., Bus 42'}
						/>
					</div>
				{/if}

				<!-- Notes -->
				<div class="form-control">
					<label class="label py-1"><span class="label-text text-xs">Notes (optional)</span></label>
					<textarea
						class="textarea textarea-bordered textarea-sm text-xs"
						bind:value={notes}
						placeholder="Platform info, delays, etc."
						rows="2"
					></textarea>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="modal-action mt-4">
			<button
				class="btn btn-primary btn-sm"
				onclick={handleSave}
				disabled={isCalculatingWalking || isLoadingConnections}
			>
				<IconSave class="size-4" />
				Save Transportation
			</button>
		</div>
	</div>
</Modal>
