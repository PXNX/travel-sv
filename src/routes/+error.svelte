<!-- Papier & Tinte: a short, quiet recovery card with only the information needed to retry safely. -->
<script lang="ts">
	import { goto } from '$app/navigation';

	let { error, status, data }: { error?: App.Error; status: number; data: { requestId?: string } } = $props();
	const requestId = $derived(error?.requestId ?? data.requestId);
	const title = $derived(status === 404 ? 'Page not found' : 'Something went wrong');
	const explanation = $derived(status === 404
		? 'This route is no longer available or has moved to another address.'
		: 'Please retry the request. If the problem continues, share the request ID with support.');
</script>

<svelte:head><title>{title} — travel-sv</title></svelte:head>

<main class="travel-page grid min-h-screen place-items-center p-5">
		<section class="travel-error-sheet w-full max-w-md p-7" aria-labelledby="error-title">
			<p class="travel-eyebrow animate-glide-in mb-2">Error {status}</p>
			<h1 id="error-title" class="travel-display animate-glide-in" style="animation-delay: 60ms">{title}</h1>
			<p class="travel-error-copy animate-glide-in" style="animation-delay: 120ms">{explanation}</p>
		{#if requestId}
			<p class="travel-error-request">Request ID <code>{requestId}</code></p>
		{/if}
			<div class="mt-6 flex flex-wrap gap-3">
				<button class="btn btn-primary" onclick={() => location.reload()}>Retry</button>
				<button class="btn btn-ghost" onclick={() => goto('/')}>Journeys</button>
		</div>
	</section>
</main>
