<!-- src/lib/components/ShareTripModal.svelte -->
<script lang="ts">
	import Modal from './Modal.svelte';
	import IconShare from '~icons/fluent/share-24-regular';
	import IconCopy from '~icons/fluent/copy-24-regular';
	import IconCheckmark from '~icons/fluent/checkmark-24-regular';
	import type { Trip, TripStop } from '$lib/types';

	interface Props {
		open: boolean;
		trip: Trip;
		locationsMap: Map<number, any>;
	}

	let { open = $bindable(), trip, locationsMap }: Props = $props();

	let shareUrl = $state('');
	let shareCopied = $state(false);

	// Generate shareable link when modal opens
	$effect(() => {
		if (open && trip) {
			generateShareUrl();
			// Auto-trigger native share if available
			if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
				setTimeout(() => shareViaNavigator(), 100);
			}
		}
	});

	function generateShareUrl() {
		const tripData = {
			name: trip.name,
			description: trip.description,
			startTime: trip.startDate,
			stops: trip.stops.map((stop) => {
				const location = locationsMap.get(stop.tipId);
				return {
					location: location
						? {
								title: location.title,
								description: location.description,
								address: location.address,
								latitude: location.latitude,
								longitude: location.longitude,
								category: location.category,
								durationMinutes: location.durationMinutes
							}
						: null,
					customDuration: stop.customDuration,
					transport: stop.transport
				};
			})
		};

		// Use encodeURIComponent to handle Unicode characters properly
		const jsonString = JSON.stringify(tripData);
		// Convert to base64 safely by first encoding to UTF-8
		const encodedData = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
			return String.fromCharCode(parseInt(p1, 16));
		}));
		shareUrl = `${window.location.origin}${window.location.pathname}?trip=${encodedData}`;
	}

	async function copyShareUrl() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			shareCopied = true;
			setTimeout(() => {
				shareCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function shareViaNavigator() {
		if (navigator.share) {
			try {
				await navigator.share({
					title: trip.name,
					text: trip.description || `Check out my trip: ${trip.name}`,
					url: shareUrl
				});
				// Close modal after successful share
				open = false;
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error('Error sharing:', err);
				}
			}
		}
	}

	function handleClose() {
		open = false;
		shareCopied = false;
	}
</script>

<Modal bind:open title="Share Trip">
	<div class="space-y-4">
		<div class="text-center">
			<h3 class="text-lg font-bold mb-2">{trip.name}</h3>
			<p class="text-base-content/70 text-sm">
				Share this trip with anyone. They can view and import it to their own planner.
			</p>
		</div>

		<div class="form-control">
			<div class="join w-full">
				<input
					type="text"
					class="input input-bordered join-item flex-1 text-xs sm:text-sm"
					value={shareUrl}
					readonly
				/>
				<button
					class="btn join-item"
					class:btn-success={shareCopied}
					onclick={copyShareUrl}
				>
					{#if shareCopied}
						<IconCheckmark class="size-4" />
						Copied!
					{:else}
						<IconCopy class="size-4" />
						Copy
					{/if}
				</button>
			</div>
			<label class="label">
				<span class="label-text-alt text-base-content/60 text-xs">
					Anyone with this link can view and import this trip
				</span>
			</label>
		</div>

		{#if navigator.share}
			<button class="btn btn-primary w-full gap-2" onclick={shareViaNavigator}>
				<IconShare class="size-5" />
				Share via...
			</button>
		{/if}

		<!-- Modal actions -->
		<div class="modal-action mt-6">
			<button class="btn btn-ghost w-full" onclick={handleClose}>Close</button>
		</div>
	</div>
</Modal>
