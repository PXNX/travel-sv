<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon?: Component<{ class?: string }>;
		class?: string;
		children: Snippet;
	}

	let { icon: Icon, class: klass = '', children }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#172a45]/60 {klass}">
	{#if Icon}
		<Icon class="size-3.5 shrink-0 text-[#a45e38]" />
	{/if}
	{@render children()}
</span>
