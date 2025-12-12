<!-- src/lib/components/TransportEditor.svelte -->
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
	}

	let {
		show = $bindable(),
		transport,
		fromLocation,
		toLocation,
		fromCoords,
		toCoords,
		suggestedDepartureTime,
		onsave
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
	 * Re-filter connections when settings change
	 */
	$effect(() => {
		if (allConnections.length > 0) {
			connections = filterConnections(allConnections);
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
	 * Filter connections based on settings (only client-side filters)
	 */
	function filterConnections(conns: Connection[]): Connection[] {
		return conns.filter((conn, index) => {
			// Check transfer times (only filter that needs client-side processing)
			if (conn.transfers > 0) {
				for (let i = 0; i < conn.legs.length - 1; i++) {
					const currentLeg = conn.legs[i];
					const nextLeg = conn.legs[i + 1];
					
					// Skip if next leg is walking
					if (nextLeg.mode === 'walking') continue;
					
					const transferTime = (nextLeg.departure.getTime() - currentLeg.arrival.getTime()) / 1000 / 60;
					
					// Check min/max transfer time
					if (transferTime < settings.minTransferTime || transferTime > settings.maxTransferTime) {
						console.log(`Connection ${index + 1} filtered: Transfer time ${transferTime}min outside range ${settings.minTransferTime}-${settings.maxTransferTime}min`);
						return false;
					}
				}
			}

			console.log(`Connection ${index + 1} passed filters`);
			return true;
		});
	}

	/**
	 * Search for connections between selected stations
	 */
	async function loadConnections() {
		if (!selectedFromStation || !selectedToStation || isLoadingConnections) return;

		isLoadingConnections = true;
		try {
			// Determine departure time for search
			let searchTime: Date | undefined;
			if (suggestedDepartureTime) {
				searchTime = suggestedDepartureTime;
			} else if (departureTime) {
				searchTime = parseDepartureTime(departureTime);
			}
			// If no time specified, searchTime remains undefined (API will use current time)

			// Search for connections with settings
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

			console.log(`Found ${allConnections.length} total connections`);
			connections = filterConnections(allConnections);
			console.log(`${connections.length} connections after filtering`);
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
	 * Select a departure station
	 */
	function selectFromStation(station: Station) {
		selectedFromStation = station;
		connections = [];
		allConnections = [];
		if (selectedToStation) {
			loadConnections();
		}
	}

	/**
	 * Select an arrival station
	 */
	function selectToStation(station: Station) {
		selectedToStation = station;
		connections = [];
		allConnections = [];
		if (selectedFromStation) {
			loadConnections();
		}
	}

	/**
	 * Select a connection and populate form
	 */
	function selectConnectionOption(connection: Connection) {
		selectedConnection = connection;

		const primaryLeg = connection.legs.find((leg) => leg.line) || connection.legs[0];
		mode = primaryLeg.mode;

		departureTime = formatTime(connection.departure);
		arrivalTime = formatTime(connection.arrival);
		durationMinutes = Math.round(connection.duration / 60);

		const lines = connection.legs
			.filter((leg) => leg.line)
			.map((leg) => leg.line)
			.join(' → ');
		routeName = lines || '';

		if (connection.transfers > 0) {
			notes = `${connection.transfers} transfer${connection.transfers > 1 ? 's' : ''}`;
		} else {
			notes = 'Direct connection';
		}

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
				const distanceKm = (route.distance / 1000).toFixed(2);
				notes = `Distance: ${distanceKm} km`;
			} else {
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				notes = 'Approximate walking time (straight-line distance)';
			}
		} catch (error) {
			console.error('Error calculating walking time:', error);
			const duration = calculateWalkingDuration(fromCoords, toCoords);
			durationMinutes = duration;
			notes = 'Approximate walking time';
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
	 * Save transportation details
	 */
	function handleSave() {
		onsave({
			mode,
			departureTime: departureTime || undefined,
			arrivalTime: arrivalTime || undefined,
			durationMinutes,
			routeName: mode === 'walking' ? undefined : (routeName || undefined),
			notes: notes || undefined
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
								{#each fromStations.slice(0, 8) as station}
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
								{#each toStations.slice(0, 8) as station}
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
							<div class="flex items-center justify-between mb-2">
								<h3 class="text-sm font-semibold">Available Connections</h3>
								<span class="text-xs text-base-content/60">{connections.length} found</span>
							</div>
							
							<div class="max-h-64 space-y-2 overflow-y-auto">
								{#each connections as connection}
									{@const primaryLeg = connection.legs.find((leg) => leg.line) || connection.legs[0]}
									{@const isRegional = isDeutschlandTicket(connection)}
									<button
										class="card bg-base-100 hover:bg-base-300 w-full text-left transition-colors p-3"
										class:ring-2={selectedConnection === connection}
										class:ring-primary={selectedConnection === connection}
										onclick={() => selectConnectionOption(connection)}
									>
										<div class="flex items-start justify-between gap-2">
											<div class="flex items-start gap-2 flex-1">
												<IconClock class="size-4 text-base-content/60 mt-0.5" />
												<div class="flex-1 min-w-0">
													<div class="font-semibold text-sm">
														{formatTime(connection.departure)} → {formatTime(connection.arrival)}
													</div>
													<div class="text-xs text-base-content/60 flex flex-wrap gap-x-2">
														<span>{formatDuration(connection.duration)}</span>
														<span>• {getTransferInfo(connection)}</span>
														{#if isRegional}
															<span class="text-success">• Regional</span>
														{/if}
													</div>
												</div>
											</div>
											{#if primaryLeg.line}
												<span class="badge badge-sm badge-primary flex-shrink-0">
													{primaryLeg.line}
												</span>
											{/if}
										</div>
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
											<a href="/settings" class="link text-xs" target="_blank">Adjust transfer time settings</a>
										</div>
									{:else}
										<div>No connections available between these stations at this time.</div>
										{#if settings.deutschlandTicketOnly}
											<div class="mt-1 text-base-content/60">Searching for regional trains only (Deutschland Ticket mode).</div>
											<div class="mt-1">
												<a href="/settings" class="link text-xs" target="_blank">Disable Deutschland Ticket mode</a> to see IC/ICE trains.
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

				<!-- Times -->
				<div class="grid grid-cols-2 gap-3">
					<div class="form-control">
						<label class="label py-1"><span class="label-text text-xs">Departure</span></label>
						<input
							type="time"
							class="input input-bordered input-sm"
							bind:value={departureTime}
							oninput={updateDuration}
						/>
					</div>
					<div class="form-control">
						<label class="label py-1"><span class="label-text text-xs">Arrival</span></label>
						<input
							type="time"
							class="input input-bordered input-sm"
							bind:value={arrivalTime}
							oninput={updateDuration}
						/>
					</div>
				</div>

				<!-- Duration -->
				<div class="form-control">
					<label class="label py-1">
						<span class="label-text text-xs">Duration</span>
						<span class="label-text-alt text-xs text-base-content/60">
							{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
						</span>
					</label>
					<input
						type="number"
						class="input input-bordered input-sm"
						bind:value={durationMinutes}
						min="1"
						step="1"
					/>
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
