<script lang="ts">
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
			'card bg-base-200 overflow-hidden shadow-sm',
			interactive || href
				? 'w-full cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]'
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
