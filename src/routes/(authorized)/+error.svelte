<script lang="ts">
	// Errors inside the signed-in app keep the navigation shell and paper styling.
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

<main class="travel-page flex min-h-[calc(100dvh-4rem)] items-center justify-center p-5 lg:p-8">
	<ErrorPanel {status} {error} {data} />
</main>
