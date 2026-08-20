<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon?: Component<{ class?: string }>;
		class?: string;
		children: Snippet;
	}

	let { icon: Icon, class: klass = '', children }: Props = $props();
</script>

<span class="text-base-content/60 flex items-center gap-1 text-xs {klass}">
	{#if Icon}
		<Icon class="size-3.5 shrink-0" />
	{/if}
	{@render children()}
</span>
