<script lang="ts">
	import AppNav from '$lib/app/AppNav.svelte';

	let { children } = $props();
</script>

<AppNav>
	{@render children()}
</AppNav>
