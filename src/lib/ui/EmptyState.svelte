<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component<{ class?: string }>;
		title: string;
		description?: string;
		accentIcon?: Component<{ class?: string }>;
		children?: Snippet;
	}

	let { icon: Icon, title, description, accentIcon: AccentIcon, children }: Props = $props();
</script>

<div class="animate-fade-in-up flex justify-center py-12 sm:py-16">
	<div class="paper-sheet relative w-full max-w-md border-dashed px-6 py-12 text-center">
		<div
			class="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center border border-[#1b2b3a]/25 bg-[#f4ecdc]"
		>
			<Icon class="h-8 w-8 text-[#1b2b3a]/70" />
			{#if AccentIcon}
				<span
					class="animate-float absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#b23b2e] text-white shadow-md"
				>
					<AccentIcon class="h-4 w-4" />
				</span>
			{/if}
		</div>

		<h2 class="travel-display text-2xl text-[#1b2b3a]">{title}</h2>
		{#if description}
			<p class="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#1b2b3a]/60">{description}</p>
		{/if}

		<div class="mt-6 flex justify-center">
			{@render children?.()}
		</div>
	</div>
</div>
