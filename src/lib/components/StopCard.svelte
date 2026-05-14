<script lang="ts">
	import type { Stop } from '$lib/types';

	interface Props {
		stop: Stop;
		arrivalTime?: Date | null;
		onupdate?: (stop: Partial<Stop> & { id: number }) => void;
		ondelete?: (stopId: number) => void;
		onpicklocation?: (stop: Stop) => void;
		dragHandle?: boolean;
	}

	let { stop, arrivalTime = null, onupdate, ondelete, onpicklocation, dragHandle = true }: Props =
		$props();

	let editingName = $state(false);
	let nameInput = $state(stop.name);
	let stayHours = $state(Math.floor((stop.stayDurationMinutes ?? 0) / 60));
	let stayMinutes = $state((stop.stayDurationMinutes ?? 0) % 60);
	let notes = $state(stop.notes ?? '');

	function saveName() {
		editingName = false;
		if (nameInput !== stop.name) {
			onupdate?.({ id: stop.id, name: nameInput });
		}
	}

	function updateDuration() {
		const total = stayHours * 60 + stayMinutes;
		if (total !== stop.stayDurationMinutes) {
			onupdate?.({ id: stop.id, stayDurationMinutes: total });
		}
	}

	function updateNotes() {
		if (notes !== stop.notes) {
			onupdate?.({ id: stop.id, notes });
		}
	}

	const arrivalFormatted = $derived(
		arrivalTime
			? arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
			: null
	);
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body gap-2 p-3">
		<div class="flex items-center gap-2">
			{#if dragHandle}
				<span class="cursor-grab text-base-content/40 touch-none select-none" aria-label="Drag to reorder">⠿</span>
			{/if}

			<div class="flex-1">
				{#if editingName}
					<input
						class="input input-bordered input-sm w-full"
						bind:value={nameInput}
						onblur={saveName}
						onkeydown={(e) => e.key === 'Enter' && saveName()}
						autofocus
					/>
				{:else}
					<button class="font-semibold hover:underline text-left" onclick={() => (editingName = true)}>
						{stop.name}
					</button>
				{/if}
			</div>

			<button
				class="btn btn-ghost btn-xs text-error"
				onclick={() => ondelete?.(stop.id)}
				aria-label="Delete stop"
			>
				✕
			</button>
		</div>

		{#if arrivalFormatted}
			<div class="text-xs text-base-content/50">🕐 Arrival: {arrivalFormatted}</div>
		{/if}

		<button
			class="text-xs text-base-content/60 hover:text-primary text-left"
			onclick={() => onpicklocation?.(stop)}
		>
			📍 {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
		</button>

		<div class="flex items-center gap-2">
			<span class="text-xs text-base-content/60">Stay:</span>
			<input
				type="number"
				class="input input-bordered input-xs w-14"
				bind:value={stayHours}
				onchange={updateDuration}
				min="0"
				max="72"
			/>
			<span class="text-xs">h</span>
			<input
				type="number"
				class="input input-bordered input-xs w-14"
				bind:value={stayMinutes}
				onchange={updateDuration}
				min="0"
				max="59"
				step="5"
			/>
			<span class="text-xs">m</span>
		</div>

		<textarea
			class="textarea textarea-bordered textarea-xs w-full"
			placeholder="Notes..."
			bind:value={notes}
			onblur={updateNotes}
			rows="1"
		></textarea>
	</div>
</div>
