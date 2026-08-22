<script lang="ts">
	// Papier & Tinte: compact folio header with ink rules and a serif destination title.
	import type { Snippet } from 'svelte';
	import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';
	import IconButton from './IconButton.svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		/** Show a back control. Provide `backHref` or `onback`. */
		backHref?: string;
		onback?: () => void;
		backLabel?: string;
		/** Replaces the plain title, e.g. with an inline-editable field. */
		titleContent?: Snippet;
		/** Trailing controls. */
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

<header
	class="sticky top-0 z-20 border-b border-[#172a45]/45 bg-[#fffdf7]/94 px-4 py-3 backdrop-blur-lg"
>
		<div class="mx-auto flex max-w-2xl flex-wrap items-center gap-2 border-l-2 border-[#e6a527] pl-2">
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
				<h1 class="travel-display truncate text-xl leading-tight text-[#172a45] sm:text-2xl">{title}</h1>
			{/if}
			{#if subtitle}
				<p class="mt-0.5 truncate text-xs font-bold tracking-[0.08em] text-[#a45e38] uppercase">{subtitle}</p>
			{/if}
		</div>

		{@render actions?.()}
	</div>
</header>
