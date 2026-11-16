<script lang="ts">
	import type { Snippet } from 'svelte';

	type Padding = 'none' | 'sm' | 'md' | 'lg';

	interface Props {
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

	const PADDING: Record<Padding, string> = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-5 sm:p-6'
	};

	const cls = $derived(
		[
			'card overflow-hidden rounded-lg border border-[#1b2b3a]/25 bg-[#fffdf7] shadow-none',
			interactive || href
				? 'w-full cursor-pointer text-left hover:-translate-y-0.5 hover:border-[#c98a1f] hover:shadow-[4px_5px_0_rgba(27,43,58,0.12)] active:scale-[0.99]'
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
