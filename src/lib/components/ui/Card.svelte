<script lang="ts">
	// Papier & Tinte: flat paper panels with ink borders, not elevated generic cards.
	import type { Snippet } from 'svelte';

	type Padding = 'none' | 'sm' | 'md';

	interface Props {
		/** Renders as a button/link with hover + press feedback. */
		interactive?: boolean;
		href?: string;
		padding?: Padding;
		class?: string;
		style?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
		[key: string]: unknown;
	}

	let {
		interactive = false,
		href,
		padding = 'md',
		class: klass = '',
		style = '',
		onclick,
		children,
		...rest
	}: Props = $props();

	const PADDING: Record<Padding, string> = { none: '', sm: 'p-3', md: 'p-4' };

	const cls = $derived(
		[
			'card overflow-hidden rounded-none border border-[#172a45]/35 bg-[#fffdf7] shadow-none',
			interactive || href
				? 'w-full cursor-pointer text-left hover:-translate-y-0.5 hover:border-[#e6a527] hover:shadow-[4px_5px_0_rgba(23,42,69,0.12)] active:scale-[0.98]'
				: '',
			PADDING[padding],
			klass
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href}
	<a {href} class={cls} {style} {...rest}>{@render children()}</a>
{:else if interactive}
	<button type="button" class={cls} {style} {onclick} {...rest}>{@render children()}</button>
{:else}
	<div class={cls} {style} {...rest}>{@render children()}</div>
{/if}
