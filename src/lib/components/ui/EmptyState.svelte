<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component<{ class?: string }>;
		title: string;
		description?: string;
		/** Small decorative icon pinned to the main one, for a bit of life. */
		accentIcon?: Component<{ class?: string }>;
		/** Call-to-action content. */
		children?: Snippet;
	}

	let { icon: Icon, title, description, accentIcon: AccentIcon, children }: Props = $props();
</script>

<div class="animate-fade-in-up flex flex-col items-center justify-center gap-5 py-20 text-center">
	<div class="relative">
		<Icon class="text-primary/70 size-16" />
		{#if AccentIcon}
			<div class="absolute -right-2 -bottom-1 animate-bounce">
				<AccentIcon class="text-warning size-7" />
			</div>
		{/if}
	</div>
	<div>
		<h2 class="text-xl font-bold">{title}</h2>
		{#if description}
			<p class="text-base-content/50 mt-2 max-w-xs text-sm leading-relaxed">{description}</p>
		{/if}
	</div>
	{@render children?.()}
</div>
