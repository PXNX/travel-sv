<script lang="ts">
	import type { Stop } from '$lib/types';
	import { dragHandle as dragHandleAction } from 'svelte-dnd-action';
	import IconClock from '~icons/material-symbols/schedule-outline-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconDelete from '~icons/material-symbols/delete-outline-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconDrag from '~icons/material-symbols/drag-indicator';

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
	let confirmingDelete = $state(false);

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

	function requestDelete() {
		confirmingDelete = true;
	}

	function confirmDelete() {
		confirmingDelete = false;
		ondelete?.(stop.id);
	}

	function cancelDelete() {
		confirmingDelete = false;
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
				<span use:dragHandleAction class="drag-handle cursor-grab text-base-content/40 touch-none select-none" aria-label="Drag to reorder">
					<IconDrag class="h-5 w-5" />
				</span>
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
				onclick={requestDelete}
				aria-label="Delete stop"
			>
				<IconClose class="h-4 w-4" />
			</button>
		</div>

		{#if arrivalFormatted}
			<div class="flex items-center gap-1 text-xs text-base-content/50">
				<IconClock class="h-3.5 w-3.5" />
				Arrival: {arrivalFormatted}
			</div>
		{/if}

		<button
			class="flex items-center gap-1 text-xs text-base-content/60 hover:text-primary text-left"
			onclick={() => onpicklocation?.(stop)}
		>
			<IconPin class="h-3.5 w-3.5" />
			{stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
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

{#if confirmingDelete}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Confirm deletion" onclick={cancelDelete} onkeydown={(e) => e.key === 'Escape' && cancelDelete()}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-base-100 rounded-2xl shadow-2xl max-w-xs w-full p-5 animate-fade-in-scale" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="flex items-center gap-3 mb-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/15">
					<IconDelete class="h-5 w-5 text-error" />
				</div>
				<div>
					<h3 class="font-bold text-sm">Delete stop?</h3>
					<p class="text-xs text-base-content/50 mt-0.5">"{stop.name}" will be removed.</p>
				</div>
			</div>
			<div class="flex gap-2 justify-end mt-4">
				<button class="btn btn-ghost btn-sm" onclick={cancelDelete}>Cancel</button>
				<button class="btn btn-error btn-sm" onclick={confirmDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}
