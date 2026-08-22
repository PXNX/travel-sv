<script lang="ts">
	import { goto } from '$app/navigation';

	let { error, status, data }: { error?: App.Error; status: number; data: { requestId?: string } } = $props();
	const requestId = $derived(error?.requestId ?? data.requestId);
	const title = $derived(status === 404 ? 'Page not found' : 'A detour appeared');
	const explanation = $derived(status === 404
		? 'This route is no longer available or has moved to another address.'
		: 'The route planner could not complete this request. Please retry in a moment.');
</script>

<svelte:head><title>{title} — travel-sv</title></svelte:head>

<main class="travel-page grid min-h-screen place-items-center p-5">
	<section class="travel-error-sheet w-full max-w-xl" aria-labelledby="error-title">
		<div class="travel-error-folio" aria-hidden="true"><span>TRAVEL-SV</span><span>REQUEST {status}</span></div>
		<div class="travel-error-mark" aria-hidden="true"><i></i><b></b></div>
		<p class="travel-error-kicker">Route interruption</p>
		<h1 id="error-title" class="travel-display">{title}</h1>
		<p class="travel-error-copy">{explanation}</p>
		{#if requestId}
			<p class="travel-error-request">Request ID <code>{requestId}</code></p>
		{/if}
		<div class="mt-7 flex flex-wrap gap-3">
			<button class="btn btn-primary" onclick={() => goto('/')}>Return to journeys</button>
			<button class="btn btn-ghost border border-[#172a45]/30" onclick={() => location.reload()}>Retry request</button>
		</div>
	</section>
</main>
