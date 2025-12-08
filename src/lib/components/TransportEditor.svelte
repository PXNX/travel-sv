<!-- src/lib/components/TransportEditor.svelte -->
<script lang="ts">
	import type { TransportSegment, TransportMode } from '$lib/types';
	import { transportInfo } from '$lib/types';
	import { getWalkingRoute, calculateWalkingDuration } from '$lib/utils/routing';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		transport: TransportSegment | null;
		fromLocation: string;
		toLocation: string;
		fromCoords?: [number, number];
		toCoords?: [number, number];
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
		onsave,
		oncancel
	}: Props = $props();

	let mode = $state<TransportMode>('railway');
	let departureTime = $state('');
	let arrivalTime = $state('');
	let durationMinutes = $state(30);
	let routeName = $state('');
	let notes = $state('');
	let isCalculatingWalking = $state(false);

	$effect(() => {
		if (show && transport) {
			mode = transport.mode;
			departureTime = transport.departureTime || '';
			arrivalTime = transport.arrivalTime || '';
			durationMinutes = transport.durationMinutes;
			routeName = transport.routeName || '';
			notes = transport.notes || '';
		} else if (show && !transport) {
			mode = 'railway';
			departureTime = '';
			arrivalTime = '';
			durationMinutes = 30;
			routeName = '';
			notes = '';
		}
	});

	// Auto-calculate duration when times change
	function updateDuration() {
		if (departureTime && arrivalTime) {
			const [depHour, depMin] = departureTime.split(':').map(Number);
			const [arrHour, arrMin] = arrivalTime.split(':').map(Number);

			let totalMinutes = arrHour * 60 + arrMin - (depHour * 60 + depMin);
			if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

			durationMinutes = totalMinutes;
		}
	}

	// Calculate walking duration when mode changes to walking
	$effect(() => {
		if (mode === 'walking' && fromCoords && toCoords && show) {
			calculateWalkingTime();
		}
	});

	async function calculateWalkingTime() {
		if (!fromCoords || !toCoords) return;

		isCalculatingWalking = true;

		try {
			// Try to get accurate route from OSRM
			const route = await getWalkingRoute(fromCoords, toCoords);

			if (route) {
				durationMinutes = route.duration;
				const distanceKm = (route.distance / 1000).toFixed(2);
				notes = `Distance: ${distanceKm} km (calculated at 3.5 km/h)`;
			} else {
				// Fallback to straight-line calculation
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				notes = 'Approximate walking time (straight-line distance)';
			}
		} catch (error) {
			console.error('Error calculating walking time:', error);
			// Use fallback calculation
			if (fromCoords && toCoords) {
				const duration = calculateWalkingDuration(fromCoords, toCoords);
				durationMinutes = duration;
				notes = 'Approximate walking time (straight-line distance)';
			}
		} finally {
			isCalculatingWalking = false;
		}
	}

	function handleSave() {
		onsave({
			mode,
			departureTime: departureTime || undefined,
			arrivalTime: arrivalTime || undefined,
			durationMinutes,
			routeName: routeName || undefined,
			notes: notes || undefined
		});
	}
</script>

<Modal bind:open={show} title="Transportation Details">
	<div class="space-y-4 p-4">
		<!-- Route -->
		<div class="alert alert-info">
			<span class="text-sm">
				<strong>From:</strong>
				{fromLocation}<br />
				<strong>To:</strong>
				{toLocation}
			</span>
		</div>

		<!-- Transport Mode -->
		<div class="form-control">
			<label class="label"><span class="label-text font-medium">Transport Mode</span></label>
			<div class="grid grid-cols-3 gap-2">
				{#each Object.values(transportInfo) as info}
					<button
						class="btn btn-sm"
						class:btn-primary={mode === info.value}
						onclick={() => (mode = info.value)}
					>
						<span class="text-lg">{info.icon}</span>
						{info.label}
					</button>
				{/each}
			</div>
		</div>

		{#if mode === 'walking' && isCalculatingWalking}
			<div class="alert">
				<span class="loading loading-spinner loading-sm"></span>
				<span class="text-sm">Calculating walking route...</span>
			</div>
		{/if}

		<!-- Times -->
		<div class="grid grid-cols-2 gap-3">
			<div class="form-control">
				<label class="label"><span class="label-text">Departure Time</span></label>
				<input
					type="time"
					class="input input-bordered"
					bind:value={departureTime}
					oninput={updateDuration}
				/>
			</div>
			<div class="form-control">
				<label class="label"><span class="label-text">Arrival Time</span></label>
				<input
					type="time"
					class="input input-bordered"
					bind:value={arrivalTime}
					oninput={updateDuration}
				/>
			</div>
		</div>

		<!-- Duration -->
		<div class="form-control">
			<label class="label">
				<span class="label-text">Duration (minutes)</span>
				{#if mode === 'walking'}
					<button
						class="btn btn-xs btn-ghost"
						onclick={calculateWalkingTime}
						disabled={isCalculatingWalking || !fromCoords || !toCoords}
					>
						Recalculate
					</button>
				{/if}
			</label>
			<input
				type="number"
				class="input input-bordered"
				bind:value={durationMinutes}
				min="1"
				step="1"
				disabled={mode === 'walking' && isCalculatingWalking}
			/>
			<label class="label">
				<span class="label-text-alt text-base-content/60">
					{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
				</span>
			</label>
		</div>

		<!-- Route Name -->
		{#if mode !== 'walking'}
			<div class="form-control">
				<label class="label">
					<span class="label-text">
						{mode === 'railway' ? 'Train Line' : 'Bus Route'}
					</span>
				</label>
				<input
					type="text"
					class="input input-bordered"
					bind:value={routeName}
					placeholder={mode === 'railway' ? 'e.g., RE7, ICE 123' : 'e.g., Bus 42'}
				/>
			</div>
		{/if}

		<!-- Notes -->
		<div class="form-control">
			<label class="label"><span class="label-text">Notes (optional)</span></label>
			<textarea
				class="textarea textarea-bordered"
				bind:value={notes}
				placeholder="Platform info, transfer details, etc."
				rows="2"
			></textarea>
		</div>

		<!-- Actions -->
		<div class="flex gap-3">
			<button class="btn btn-primary flex-1" onclick={handleSave} disabled={isCalculatingWalking}>
				<IconSave class="size-4" />
				Save
			</button>
		</div>
	</div>
</Modal>
