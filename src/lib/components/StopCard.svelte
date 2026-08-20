<script lang="ts">
	import type { Stop } from '$lib/types';
	import { dragHandle as dragHandleAction } from 'svelte-dnd-action';
	import { Card, ConfirmDialog, IconButton, MetaItem } from '$lib/components/ui';
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
	let nameInput = $state('');
	let stayHours = $state(0);
	let stayMinutes = $state(0);
	let notes = $state('');

	$effect.pre(() => {
		nameInput = stop.name;
	});
	$effect.pre(() => {
		stayHours = Math.floor((stop.stayDurationMinutes ?? 0) / 60);
	});
	$effect.pre(() => {
		stayMinutes = (stop.stayDurationMinutes ?? 0) % 60;
	});
	$effect.pre(() => {
		notes = stop.notes ?? '';
	});
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

	function confirmDelete() {
		confirmingDelete = false;
		ondelete?.(stop.id);
	}

	function focusOnMount(node: HTMLElement) {
		node.focus();
	}

	const arrivalFormatted = $derived(
		arrivalTime
			? arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
			: null
	);
</script>

<Card padding="none">
	<div class="flex flex-col gap-2 p-3">
		<div class="flex items-center gap-2">
			{#if dragHandle}
				<span
					use:dragHandleAction
					class="drag-handle text-base-content/40 cursor-grab touch-none select-none"
					aria-label="Drag to reorder"
				>
					<IconDrag class="size-5" />
				</span>
			{/if}

			<div class="min-w-0 flex-1">
				{#if editingName}
					<!-- svelte-ignore a11y_autofocus -->
					<input
						class="input input-sm w-full"
						bind:value={nameInput}
						onblur={saveName}
						onkeydown={(e) => e.key === 'Enter' && saveName()}
						use:focusOnMount
					/>
				{:else}
					<button
						class="truncate text-left font-semibold hover:underline"
						onclick={() => (editingName = true)}
					>
						{stop.name}
					</button>
				{/if}
			</div>

			<IconButton
				icon={IconClose}
				label="Delete stop"
				size="xs"
				class="text-error shrink-0"
				onclick={() => (confirmingDelete = true)}
			/>
		</div>

		{#if arrivalFormatted}
			<MetaItem icon={IconClock} class="text-base-content/50">Arrival: {arrivalFormatted}</MetaItem>
		{/if}

		<button
			class="text-base-content/60 hover:text-primary flex items-center gap-1 text-left text-xs transition-colors"
			onclick={() => onpicklocation?.(stop)}
		>
			<IconPin class="size-3.5 shrink-0" />
			{stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
		</button>

		<div class="flex items-center gap-2">
			<span class="text-base-content/60 text-xs">Stay:</span>
			<input
				type="number"
				class="input input-xs w-14"
				aria-label="Stay hours"
				bind:value={stayHours}
				onchange={updateDuration}
				min="0"
				max="72"
			/>
			<span class="text-xs">h</span>
			<input
				type="number"
				class="input input-xs w-14"
				aria-label="Stay minutes"
				bind:value={stayMinutes}
				onchange={updateDuration}
				min="0"
				max="59"
				step="5"
			/>
			<span class="text-xs">m</span>
		</div>

		<textarea
			class="textarea textarea-xs w-full"
			placeholder="Notes..."
			aria-label="Notes"
			bind:value={notes}
			onblur={updateNotes}
			rows="1"
		></textarea>
	</div>
</Card>

<ConfirmDialog
	bind:open={confirmingDelete}
	title="Delete stop?"
	icon={IconDelete}
	tone="error"
	confirmLabel="Delete"
	onconfirm={confirmDelete}
>
	“{stop.name}” will be removed from this journey.
</ConfirmDialog>
