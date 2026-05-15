<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="animate-fade-in">
	{@render children()}
</div>
