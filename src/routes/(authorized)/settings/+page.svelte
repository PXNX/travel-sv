<!-- src/routes/(authorized)/settings/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadTransportSettings,
		saveTransportSettings,
		resetTransportSettings,
		type TransportSettings
	} from '$lib/stores/transportSettings';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconReset from '~icons/fluent/arrow-reset-24-regular';
	import IconTrain from '~icons/fluent/vehicle-subway-24-regular';
	import IconClock from '~icons/fluent/clock-24-regular';

	let settings = $state<TransportSettings>({
		minTransferTime: 5,
		maxTransferTime: 60,
		deutschlandTicketOnly: false,
		maxConnections: 10
	});

	let saved = $state(false);

	onMount(() => {
		settings = loadTransportSettings();
	});

	function handleSave() {
		saveTransportSettings(settings);
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function handleReset() {
		settings = resetTransportSettings();
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}
</script>

<svelte:head>
	<title>Transport Settings - Trip Planner</title>
</svelte:head>

<div class="container mx-auto max-w-2xl p-4 space-y-6">
	<div class="flex items-center gap-3 mb-6">
		<IconTrain class="size-8 text-primary" />
		<h1 class="text-3xl font-bold">Transport Settings</h1>
	</div>

	<div class="card bg-base-200">
		<div class="card-body">
			<h2 class="card-title text-lg mb-4">Connection Preferences</h2>

			<!-- Deutschland Ticket Only -->
			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-4">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={settings.deutschlandTicketOnly}
					/>
					<div class="flex-1">
						<span class="label-text font-medium">Deutschland Ticket Only</span>
						<p class="text-xs text-base-content/60 mt-1">
							Show only regional trains (RE, RB, S-Bahn). Excludes ICE, IC, and EC.
						</p>
					</div>
				</label>
			</div>

			<div class="divider"></div>

			<!-- Transfer Time Settings -->
			<div class="space-y-4">
				<div class="flex items-center gap-2 mb-2">
					<IconClock class="size-5 text-primary" />
					<h3 class="font-semibold">Transfer Time Limits</h3>
				</div>

				<!-- Minimum Transfer Time -->
				<div class="form-control">
					<label class="label">
						<span class="label-text font-medium">Minimum Transfer Time</span>
						<span class="label-text-alt font-mono">{settings.minTransferTime} min</span>
					</label>
					<input
						type="range"
						min="0"
						max="30"
						step="5"
						class="range range-primary"
						bind:value={settings.minTransferTime}
					/>
					<div class="flex w-full justify-between px-2 text-xs">
						<span>0 min</span>
						<span>5 min</span>
						<span>10 min</span>
						<span>15 min</span>
						<span>20 min</span>
						<span>25 min</span>
						<span>30 min</span>
					</div>
					<p class="text-xs text-base-content/60 mt-2">
						Minimum time between connections. Set to 0 to see all connections.
					</p>
				</div>

				<!-- Maximum Transfer Time -->
				<div class="form-control">
					<label class="label">
						<span class="label-text font-medium">Maximum Transfer Time</span>
						<span class="label-text-alt font-mono">{settings.maxTransferTime} min</span>
					</label>
					<input
						type="range"
						min="15"
						max="120"
						step="15"
						class="range range-primary"
						bind:value={settings.maxTransferTime}
					/>
					<div class="flex w-full justify-between px-2 text-xs">
						<span>15</span>
						<span>30</span>
						<span>45</span>
						<span>60</span>
						<span>75</span>
						<span>90</span>
						<span>105</span>
						<span>120</span>
					</div>
					<p class="text-xs text-base-content/60 mt-2">
						Maximum waiting time between connections. Filters out long layovers.
					</p>
				</div>
			</div>

			<div class="divider"></div>

			<!-- Max Connections -->
			<div class="form-control">
				<label class="label">
					<span class="label-text font-medium">Maximum Connections to Show</span>
					<span class="label-text-alt font-mono">{settings.maxConnections}</span>
				</label>
				<input
					type="range"
					min="5"
					max="20"
					step="5"
					class="range range-primary"
					bind:value={settings.maxConnections}
				/>
				<div class="flex w-full justify-between px-2 text-xs">
					<span>5</span>
					<span>10</span>
					<span>15</span>
					<span>20</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex gap-3">
		<button class="btn btn-primary flex-1" onclick={handleSave}>
			<IconSave class="size-5" />
			Save Settings
		</button>
		<button class="btn btn-ghost" onclick={handleReset}>
			<IconReset class="size-5" />
			Reset to Defaults
		</button>
	</div>

	{#if saved}
		<div class="alert alert-success">
			<span>Settings saved successfully!</span>
		</div>
	{/if}
</div>
