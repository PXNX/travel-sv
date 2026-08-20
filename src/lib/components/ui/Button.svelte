<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'error' | 'neutral' | 'outline';
	type Size = 'xs' | 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		icon?: Component<{ class?: string }>;
		iconRight?: Component<{ class?: string }>;
		loading?: boolean;
		disabled?: boolean;
		block?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		variant = 'primary',
		size = 'md',
		icon: Icon,
		iconRight: IconRight,
		loading = false,
		disabled = false,
		block = false,
		href,
		type = 'button',
		class: klass = '',
		onclick,
		children,
		...rest
	}: Props = $props();

	// Elevation is baked into the variant so a primary action never looks
	// slightly different from one screen to the next.
	const VARIANT: Record<Variant, string> = {
		primary: 'btn-primary shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30',
		secondary: 'btn-secondary shadow-sm shadow-secondary/25',
		ghost: 'btn-ghost',
		error: 'btn-error shadow-sm shadow-error/25',
		neutral: 'btn-neutral',
		outline: 'btn-outline'
	};
	const SIZE: Record<Size, string> = { xs: 'btn-xs', sm: 'btn-sm', md: '', lg: 'btn-lg' };
	const ICON_SIZE: Record<Size, string> = {
		xs: 'size-3.5',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-5'
	};
	const SPINNER: Record<Size, string> = {
		xs: 'loading-xs',
		sm: 'loading-xs',
		md: 'loading-sm',
		lg: 'loading-md'
	};

	const cls = $derived(
		['btn gap-1.5', VARIANT[variant], SIZE[size], block ? 'btn-block' : '', klass]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#snippet content()}
	<!-- The spinner replaces the icon rather than the label, so the button keeps its width. -->
	{#if loading}
		<span class="loading loading-spinner {SPINNER[size]}"></span>
	{:else if Icon}
		<Icon class={ICON_SIZE[size]} />
	{/if}
	{@render children?.()}
	{#if IconRight && !loading}
		<IconRight class={ICON_SIZE[size]} />
	{/if}
{/snippet}

{#if href}
	<a
		{href}
		class={cls}
		class:btn-disabled={disabled || loading}
		aria-disabled={disabled || loading ? 'true' : undefined}
		{...rest}
	>
		{@render content()}
	</a>
{:else}
	<button {type} class={cls} disabled={disabled || loading} {onclick} {...rest}>
		{@render content()}
	</button>
{/if}
