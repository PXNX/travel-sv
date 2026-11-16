<script lang="ts">
	// Global fallback for errors outside the route groups.
	import ErrorPanel from '$lib/app/ErrorPanel.svelte';

	let {
		error,
		status,
		data
	}: {
		error?: App.Error & { message?: string };
		status: number;
		data: { requestId?: string };
	} = $props();
</script>

<svelte:head><title>Error {status} — Travel Planner</title></svelte:head>

<main class="travel-page grid min-h-screen place-items-center p-5">
	<ErrorPanel {status} {error} {data} />
</main>
