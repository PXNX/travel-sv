<script lang="ts">
	// Dev-only visual harness. The real screens need OAuth + Postgres; this route
	// renders the same components with sample data so UI work can be reviewed offline.
	import { dev } from '$app/environment';
	import type { JourneyWithDerived, Stop, Segment, Journey } from '$lib/types';

	function showInstallHint() {
		try {
			localStorage.removeItem('travel-install-hint-dismissed');
		} catch {
			// ignore
		}
		const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
			prompt: () => Promise<void>;
			userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
		};
		event.prompt = async () => {};
		event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
		window.dispatchEvent(event);
	}

	import IndexPage from '../(authorized)/+page.svelte';
	import EditorPage from '../(authorized)/journeys/[id]/+page.svelte';
	import CompletedPage from '../(authorized)/journeys/completed/+page.svelte';
	import SharedPage from '../(public)/j/[shareToken]/+page.svelte';
	import LoginPage from '../(public)/auth/login/+page.svelte';
	import ErrorPage from '../+error.svelte';

	type Screen = 'index' | 'editor' | 'completed' | 'shared' | 'login' | 'empty' | 'error';
	let screen = $state<Screen>('index');

	const now = new Date();
	const iso = (d: Date) => d.toISOString();
	const at = (dayOffset: number, hour: number, minute = 0) => {
		const d = new Date(now);
		d.setDate(d.getDate() + dayOffset);
		d.setHours(hour, minute, 0, 0);
		return iso(d);
	};

	const stops: Stop[] = [
		{
			id: 1,
			journeyId: 1,
			name: 'Berlin Hbf',
			lat: 52.5251,
			lon: 13.3694,
			orderIndex: 0,
			stayDurationMinutes: 0,
			notes: 'Start early — coffee at the station.'
		},
		{
			id: 2,
			journeyId: 1,
			name: 'Hamburg Central',
			lat: 53.5528,
			lon: 10.0067,
			orderIndex: 1,
			stayDurationMinutes: 90,
			notes: 'Lunch near the harbour.'
		},
		{
			id: 3,
			journeyId: 1,
			name: 'Lüneburg',
			lat: 53.2489,
			lon: 10.4136,
			orderIndex: 2,
			stayDurationMinutes: 120,
			notes: 'Old town & salt works.'
		},
		{
			id: 4,
			journeyId: 1,
			name: 'Hannover Hbf',
			lat: 52.3766,
			lon: 9.7411,
			orderIndex: 3,
			stayDurationMinutes: 60,
			notes: null
		}
	];

	const segments: Segment[] = [
		{
			id: 1,
			journeyId: 1,
			fromStopId: 1,
			toStopId: 2,
			mode: 'transit',
			travelDurationMinutes: 106,
			distanceM: 286000,
			transfers: 0,
			transitSummary: 'ICE 704 · Berlin Hbf → Hamburg Hbf',
			transitLegs: [
				{ type: 'walking', durationMinutes: 6, distanceM: 420 },
				{
					type: 'transport',
					lineName: 'ICE 704',
					product: 'ICE',
					direction: 'Hamburg Hbf',
					departure: at(0, 8, 6),
					arrival: at(0, 9, 52),
					departureStation: 'Berlin Hbf',
					arrivalStation: 'Hamburg Hbf',
					departureStationId: '8011160',
					arrivalStationId: '8002549',
					durationMinutes: 106,
					platform: '7'
				}
			]
		},
		{
			id: 2,
			journeyId: 1,
			fromStopId: 2,
			toStopId: 3,
			mode: 'transit',
			travelDurationMinutes: 42,
			distanceM: 56000,
			transfers: 1,
			transitSummary: 'RE 3 → RB 31 · Hamburg → Lüneburg',
			transitLegs: [
				{
					type: 'transport',
					lineName: 'RE 3',
					product: 'RE',
					direction: 'Lüneburg',
					durationMinutes: 28
				},
				{ type: 'walking', durationMinutes: 7, distanceM: 180 },
				{
					type: 'transport',
					lineName: 'RB 31',
					product: 'RB',
					direction: 'Lüneburg',
					durationMinutes: 14
				}
			]
		},
		{
			id: 3,
			journeyId: 1,
			fromStopId: 3,
			toStopId: 4,
			mode: 'drive',
			travelDurationMinutes: 55,
			distanceM: 76000,
			elevationUpM: 120,
			elevationDownM: 95
		}
	];

	const baseJourney: Journey = {
		id: 1,
		ownerId: 'demo',
		title: 'Northern Germany Weekend',
		description: 'A slow three-city trip from Berlin up to the coast and back through the heath.',
		isPublic: true,
		shareToken: '11111111-1111-4111-8111-111111111111',
		startDatetime: at(0, 8, 0),
		minimumTransferMinutes: 8,
		deutschlandticketOnly: false,
		isCompleted: false,
		createdAt: iso(new Date(now.getTime() - 6 * 86400000)),
		updatedAt: iso(now)
	};

	const journeyWithDerived: JourneyWithDerived = {
		...baseJourney,
		firstStopName: 'Berlin Hbf',
		lastStopName: 'Hannover Hbf',
		stopCount: 4,
		totalDurationMinutes: 423,
		stopCoords: stops.map((s) => ({ lat: s.lat, lon: s.lon }))
	};

	const moreJourneys: JourneyWithDerived[] = [
		journeyWithDerived,
		{
			...baseJourney,
			id: 2,
			title: 'Rhine Valley by Rail',
			isPublic: false,
			startDatetime: at(12, 9, 30),
			firstStopName: 'Köln Hbf',
			lastStopName: 'Mainz Hbf',
			stopCount: 6,
			totalDurationMinutes: 512,
			stopCoords: [
				{ lat: 50.943, lon: 6.958 },
				{ lat: 50.075, lon: 7.599 },
				{ lat: 50.114, lon: 7.587 },
				{ lat: 50.005, lon: 8.261 }
			]
		},
		{
			...baseJourney,
			id: 3,
			title: 'Alpinepass / Dolomites',
			isPublic: false,
			startDatetime: null,
			firstStopName: 'München Hbf',
			lastStopName: 'Bolzano',
			stopCount: 3,
			totalDurationMinutes: 0,
			stopCoords: [
				{ lat: 48.14, lon: 11.558 },
				{ lat: 47.05, lon: 11.4 },
				{ lat: 46.5, lon: 11.35 }
			]
		}
	];

	const indexData = {
		journeys: moreJourneys,
		completedCount: 2,
		user: { id: 'demo', email: 'demo@example.com', name: 'Alex Reisender', isAdmin: false }
	};
	const editorData = { journey: baseJourney, stops, segments, user: indexData.user };
	const completedData = {
		journeys: [
			{
				...journeyWithDerived,
				id: 9,
				title: 'Paris Spring Break',
				isCompleted: true,
				firstStopName: 'Karlsruhe',
				lastStopName: 'Paris Gare du Nord'
			},
			{
				...journeyWithDerived,
				id: 10,
				title: 'Odense & Copenhagen',
				isCompleted: true,
				firstStopName: 'Hamburg Hbf',
				lastStopName: 'København H'
			}
		]
	};
	const sharedData = { journey: { ...baseJourney, ownerName: 'Alex Reisender' }, stops, segments };

	const screens: { id: Screen; label: string }[] = [
		{ id: 'index', label: 'Journeys' },
		{ id: 'editor', label: 'Editor' },
		{ id: 'completed', label: 'Completed' },
		{ id: 'shared', label: 'Shared' },
		{ id: 'empty', label: 'Empty state' },
		{ id: 'login', label: 'Login' },
		{ id: 'error', label: 'Error' }
	];
</script>

<svelte:head><title>UI Preview — travel-sv</title></svelte:head>

{#if dev}
	<nav class="preview-bar" aria-label="Preview screens">
		<span class="preview-mark">UI</span>
		{#each screens as s}
			<button class:active={screen === s.id} onclick={() => (screen = s.id)}>{s.label}</button>
		{/each}
		<button class="ml-auto border-[#e6a527] text-[#e6a527]" onclick={showInstallHint}>
			Install hint
		</button>
	</nav>

	<div class="preview-stage">
		{#key screen}
			{#if screen === 'index'}
				<IndexPage data={indexData as any} />
			{:else if screen === 'editor'}
				<EditorPage data={editorData as any} />
			{:else if screen === 'completed'}
				<CompletedPage data={completedData as any} />
			{:else if screen === 'shared'}
				<SharedPage data={sharedData as any} />
			{:else if screen === 'empty'}
				<IndexPage
					data={{
						journeys: [],
						completedCount: 0,
						user: { ...indexData.user, id: 'demo-empty' }
					} as any}
				/>
			{:else if screen === 'login'}
				<LoginPage />
			{:else if screen === 'error'}
				<ErrorPage status={404} data={{ requestId: 'd3m0-4b71-9f2a' }} />
			{/if}
		{/key}
	</div>
{:else}
	<main class="travel-page grid min-h-screen place-items-center p-6">
		<p class="travel-folio">Not found</p>
	</main>
{/if}

<style>
	.preview-bar {
		position: sticky;
		top: 0;
		z-index: 6000;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		border-bottom: 1px solid #172a45;
		background: #172a45;
		padding: 0.5rem 0.75rem;
	}
	.preview-mark {
		margin-right: 0.5rem;
		border: 1px solid #e6a527;
		padding: 0.1rem 0.35rem;
		color: #e6a527;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
	}
	.preview-bar button {
		border: 1px solid transparent;
		padding: 0.35rem 0.7rem;
		color: #fffdf7;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.preview-bar button:hover {
		border-color: #e6a527;
	}
	.preview-bar button.active {
		background: #e6a527;
		border-color: #e6a527;
		color: #172a45;
		font-weight: 700;
	}
	.preview-stage {
		min-height: calc(100dvh - 3rem);
	}
</style>
