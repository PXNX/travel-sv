<script lang="ts">
	import { onMount } from 'svelte';

	let isOffline = $state(false);

	onMount(() => {
		isOffline = !navigator.onLine;

		const goOffline = () => (isOffline = true);
		const goOnline = () => (isOffline = false);

		window.addEventListener('offline', goOffline);
		window.addEventListener('online', goOnline);

		return () => {
			window.removeEventListener('offline', goOffline);
			window.removeEventListener('online', goOnline);
		};
	});
</script>

{#if isOffline}
	<div class="alert alert-warning fixed top-0 right-0 left-0 z-50 rounded-none shadow-lg">
		<span>📡 You are offline. Some features may be unavailable.</span>
	</div>
{/if}
