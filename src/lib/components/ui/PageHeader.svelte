<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconButton from './IconButton.svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		backHref?: string;
		onback?: () => void;
		backLabel?: string;
		titleContent?: Snippet;
		actions?: Snippet;
	}

	let {
		title,
		subtitle,
		backHref,
		onback,
		backLabel = 'Back',
		titleContent,
		actions
	}: Props = $props();

	const showBack = $derived(!!backHref || !!onback);
</script>

<header class="sticky top-0 z-20 border-b border-[#172a45]/45 bg-[#fffdf7]/95 backdrop-blur-lg">
	<div
		class="mx-auto flex max-w-2xl flex-wrap items-center gap-2 border-l-2 border-[#e6a527] py-3 pr-4 pl-2.5"
	>
		{#if showBack}
			<IconButton
				icon={IconArrowBack}
				label={backLabel}
				href={backHref}
				onclick={onback}
				class="-ml-1.5 shrink-0"
			/>
		{/if}

		<div class="min-w-0 flex-1">
			{#if titleContent}
				{@render titleContent()}
			{:else if title}
				<h1
					class="travel-display animate-glide-in truncate text-[22px] leading-tight text-[#172a45] sm:text-2xl"
				>
					{title}
				</h1>
			{/if}
			{#if subtitle}
				<p class="travel-eyebrow animate-glide-in mt-0.5 truncate" style="animation-delay: 70ms">
					{subtitle}
				</p>
			{/if}
		</div>

		{@render actions?.()}
	</div>
</header>
