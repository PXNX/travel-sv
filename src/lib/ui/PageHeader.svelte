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

<header class="sticky top-0 z-20 border-b border-[#1b2b3a]/30 bg-[#fffdf7]/95 backdrop-blur-lg">
	<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
		{#if showBack}
			<IconButton
				icon={IconArrowBack}
				label={backLabel}
				href={backHref}
				onclick={onback}
				class="shrink-0"
			/>
		{/if}

		<div class="min-w-0 flex-1 border-l-2 border-[#c98a1f] pl-3">
			{#if titleContent}
				{@render titleContent()}
			{:else if title}
				<h1
					class="travel-display animate-glide-in truncate text-xl leading-tight text-[#1b2b3a] sm:text-2xl"
				>
					{title}
				</h1>
			{/if}
			{#if subtitle}
				<p class="paper-eyebrow animate-glide-in mt-0.5 truncate" style="animation-delay: 60ms">
					{subtitle}
				</p>
			{/if}
		</div>

		{@render actions?.()}
	</div>
</header>
