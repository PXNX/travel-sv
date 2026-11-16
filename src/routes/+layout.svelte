<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import InstallHint from '$lib/app/InstallHint.svelte';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}

<InstallHint />
