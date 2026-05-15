<script lang="ts">
	import { onMount } from 'svelte';
	import IconWifiOff from '~icons/material-symbols/wifi-off-rounded';

	let isOffline = $state(false);
	let show = $state(false);

	onMount(() => {
		isOffline = !navigator.onLine;
		show = isOffline;

		const goOffline = () => { isOffline = true; requestAnimationFrame(() => show = true); };
		const goOnline = () => { show = false; setTimeout(() => isOffline = false, 300); };

		window.addEventListener('offline', goOffline);
		window.addEventListener('online', goOnline);

		return () => {
			window.removeEventListener('offline', goOffline);
			window.removeEventListener('online', goOnline);
		};
	});
</script>

{#if isOffline}
	<div
		class="alert alert-warning fixed top-0 right-0 left-0 z-50 rounded-none shadow-lg transition-all duration-300"
		class:translate-y-0={show}
		class:-translate-y-full={!show}
	>
		<IconWifiOff class="h-5 w-5" />
		<span>You are offline. Some features may be unavailable.</span>
	</div>
{/if}
