<script lang="ts">
	import type { Stop } from '$lib/types';
	import { dragHandle as dragHandleAction } from 'svelte-dnd-action';
	import { Card, ConfirmDialog, IconButton, MetaItem } from '$lib/components/ui';
	import IconClock from '~icons/material-symbols/schedule-outline-rounded';
	import IconPin from '~icons/material-symbols/location-on-outline-rounded';
	import IconDelete from '~icons/material-symbols/delete-outline-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconDrag from '~icons/material-symbols/drag-indicator';
	import IconUp from '~icons/material-symbols/keyboard-arrow-up-rounded';
	import IconDown from '~icons/material-symbols/keyboard-arrow-down-rounded';

	interface Props {
		stop: Stop;
		arrivalTime?: Date | null;
		onupdate?: (stop: Partial<Stop> & { id: number }) => void;
		ondelete?: (stopId: number) => void;
		onpicklocation?: (stop: Stop) => void;
		onmove?: (direction: -1 | 1) => void;
		index?: number;
		total?: number;
		dragHandle?: boolean;
		readonly?: boolean;
	}

	let {
		stop,
		arrivalTime = null,
		onupdate,
		ondelete,
		onpicklocation,
		onmove,
		index = 0,
		total = 1,
		dragHandle = true,
		readonly = false
	}: Props = $props();

	let editingName = $state(false);
	let nameInput = $state('');
	let stayHours = $state(0);
	let stayMinutes = $state(0);
	let notes = $state('');
	let confirmingDelete = $state(false);

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

	function saveName() {
		editingName = false;
		if (nameInput !== stop.name) onupdate?.({ id: stop.id, name: nameInput });
	}

	function updateDuration() {
		const total = stayHours * 60 + stayMinutes;
		if (total !== stop.stayDurationMinutes) onupdate?.({ id: stop.id, stayDurationMinutes: total });
	}

	function updateNotes() {
		if (notes !== stop.notes) onupdate?.({ id: stop.id, notes });
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

	const staySummary = $derived(
		stayHours > 0 || stayMinutes > 0 ? `${stayHours}h ${stayMinutes}m` : 'No stay'
	);
</script>

<div class="flex gap-2.5">
	<!-- timetable number -->
	<div class="flex w-8 shrink-0 flex-col items-center pt-2.5">
		<span
			class="travel-display animate-soft-pop flex h-8 w-8 items-center justify-center border border-[#172a45]/45 bg-[#fffdf7] text-base text-[#172a45]"
		>
			{index + 1}
		</span>
		{#if index < total - 1}
			<span class="w-px flex-1 bg-[#e6a527]/60"></span>
		{/if}
	</div>

	<Card padding="none" class="min-w-0 flex-1">
		<div class="p-3">
			<div class="flex items-center gap-2">
				{#if dragHandle && !readonly}
					<span
						use:dragHandleAction
						class="cursor-grab touch-none text-[#172a45]/35 select-none"
						aria-label="Drag to reorder"
					>
						<IconDrag class="size-5" />
					</span>
				{/if}

				<div class="min-w-0 flex-1">
					{#if editingName && !readonly}
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="input input-sm w-full border-[#172a45]/30"
							bind:value={nameInput}
							onblur={saveName}
							onkeydown={(e) => e.key === 'Enter' && saveName()}
							use:focusOnMount
						/>
					{:else}
						<p class="travel-display truncate text-[17px] leading-tight text-[#172a45]">
							{#if readonly}
								{stop.name}
							{:else}
								<button class="text-left hover:text-[#a45e38]" onclick={() => (editingName = true)}>
									{stop.name}
								</button>
							{/if}
						</p>
					{/if}
					{#if arrivalFormatted}
						<p class="travel-eyebrow mt-0.5 text-[9px]">Arrival {arrivalFormatted}</p>
					{/if}
				</div>

				{#if !readonly}
					<div class="flex shrink-0 items-center gap-0.5">
						{#if onmove}
							<IconButton
								icon={IconUp}
								label="Move stop earlier"
								size="xs"
								disabled={index === 0}
								class="text-[#172a45]/40 hover:text-[#a45e38]"
								onclick={() => onmove?.(-1)}
							/>
							<IconButton
								icon={IconDown}
								label="Move stop later"
								size="xs"
								disabled={index === total - 1}
								class="text-[#172a45]/40 hover:text-[#a45e38]"
								onclick={() => onmove?.(1)}
							/>
						{/if}
						<IconButton
							icon={IconClose}
							label="Delete stop"
							size="xs"
							class="text-[#a83a2b]/60 hover:text-[#a83a2b]"
							onclick={() => (confirmingDelete = true)}
						/>
					</div>
				{/if}
			</div>

			<div
				class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#172a45]/12 pt-2"
			>
				<svelte:element
					this={readonly ? 'div' : 'button'}
					type={readonly ? undefined : 'button'}
					role={readonly ? undefined : 'button'}
					class="inline-flex items-center gap-1 text-[11px] text-[#172a45]/55 {readonly
						? ''
						: 'hover:text-[#a45e38]'}"
					onclick={readonly ? undefined : () => onpicklocation?.(stop)}
				>
					<IconPin class="size-3.5 shrink-0 text-[#a45e38]" />
					{stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
				</svelte:element>

				{#if readonly}
					<MetaItem icon={IconClock}>{staySummary}</MetaItem>
				{:else}
					<div class="flex items-center gap-1.5">
						<span class="travel-eyebrow text-[9px]">Stay</span>
						<input
							type="number"
							class="input input-xs w-12 border-[#172a45]/25 px-1 text-center"
							aria-label="Stay hours"
							bind:value={stayHours}
							onchange={updateDuration}
							min="0"
							max="72"
						/>
						<span class="text-[11px] text-[#172a45]/50">h</span>
						<input
							type="number"
							class="input input-xs w-12 border-[#172a45]/25 px-1 text-center"
							aria-label="Stay minutes"
							bind:value={stayMinutes}
							onchange={updateDuration}
							min="0"
							max="59"
							step="5"
						/>
						<span class="text-[11px] text-[#172a45]/50">m</span>
					</div>
				{/if}
			</div>

			{#if readonly}
				{#if stop.notes}
					<p
						class="mt-2 border-l-2 border-[#e6a527] pl-2 text-[11px] leading-relaxed text-[#172a45]/65"
					>
						{stop.notes}
					</p>
				{/if}
			{:else}
				<textarea
					class="textarea textarea-xs mt-2 w-full resize-y border-[#172a45]/20 pl-2 text-[11px]"
					style="min-height: 2.25rem; padding-top: 0.35rem; padding-bottom: 0.35rem"
					placeholder="Notes for this stop…"
					aria-label="Notes"
					bind:value={notes}
					onblur={updateNotes}
					rows="1"></textarea>
			{/if}
		</div>
	</Card>
</div>

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
