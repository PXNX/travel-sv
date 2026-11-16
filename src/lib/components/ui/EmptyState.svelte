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

<div class="animate-fade-in-up flex justify-center py-12 text-center sm:py-16">
	<div
		class="relative w-full max-w-md border border-dashed border-[#172a45]/35 bg-[#fffdf7]/70 px-6 py-10"
	>
		<div
			class="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center border border-[#172a45]/25 bg-[#f4eee0]"
		>
			<Icon class="h-8 w-8 text-[#172a45]/70" />
			{#if AccentIcon}
				<span
					class="animate-sway absolute -right-3 -bottom-2 flex h-8 w-8 items-center justify-center border border-[#e6a527]/60 bg-[#fffdf7]"
				>
					<AccentIcon class="h-4 w-4 text-[#b0781b]" />
				</span>
			{/if}
		</div>

		<h2 class="travel-display text-2xl text-[#172a45]">{title}</h2>
		{#if description}
			<p class="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#172a45]/60">{description}</p>
		{/if}

		<div class="mt-6 flex justify-center">
			{@render children?.()}
		</div>
	</div>
</div>
