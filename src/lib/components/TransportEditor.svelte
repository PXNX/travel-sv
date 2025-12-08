<!-- src/lib/components/TransportEditor.svelte -->
<script lang="ts">
	import type { TransportSegment, TransportMode } from '$lib/types';
	import { transportInfo } from '$lib/types';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		transport: TransportSegment | null;
		fromLocation: string;
		toLocation: string;
		onsave: (transport: TransportSegment) => void;
		oncancel: () => void;
	}

	let {
		show = $bindable(),
		transport,
		fromLocation,
		toLocation,
		onsave,
		oncancel
	}: Props = $props();

	let mode = $state<TransportMode>('railway');
	let departureTime = $state('');
	let arrivalTime = $state('');
	let durationMinutes = $state(30);
	let routeName = $state('');
	let notes = $state('');

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
			<label class="label"><span class="label-text">Duration (minutes)</span></label>
			<input
				type="number"
				class="input input-bordered"
				bind:value={durationMinutes}
				min="1"
				step="1"
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
			<button class="btn btn-primary flex-1" onclick={handleSave}>
				<IconSave class="size-4" />
				Save
			</button>
		</div>
	</div>
</Modal>
