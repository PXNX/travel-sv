<script lang="ts">
	// Public errors (login, shared links) get the same paper sheet without the app shell.
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
	<ErrorPanel {status} {error} {data} compact />
</main>
