<script lang="ts">
	import type { Component } from 'svelte';

	type Variant = 'primary' | 'ghost' | 'error' | 'neutral';
	type Size = 'xs' | 'sm' | 'md' | 'lg';

	interface Props {
		icon: Component<{ class?: string }>;
		/** Required: icon-only controls have no visible text to announce. */
		label: string;
		variant?: Variant;
		size?: Size;
		circle?: boolean;
		loading?: boolean;
		disabled?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void;
		[key: string]: unknown;
	}

	let {
		icon: Icon,
		label,
		variant = 'ghost',
		size = 'sm',
		circle = true,
		loading = false,
		disabled = false,
		href,
		type = 'button',
		class: klass = '',
		onclick,
		...rest
	}: Props = $props();

	const VARIANT: Record<Variant, string> = {
		primary: 'btn-primary shadow-sm shadow-primary/25',
		ghost: 'btn-ghost',
		error: 'btn-error',
		neutral: 'btn-neutral'
	};
	const SIZE: Record<Size, string> = { xs: 'btn-xs', sm: 'btn-sm', md: '', lg: 'btn-lg' };
	const ICON_SIZE: Record<Size, string> = {
		xs: 'size-4',
		sm: 'size-5',
		md: 'size-5',
		lg: 'size-6'
	};
	const SPINNER: Record<Size, string> = {
		xs: 'loading-xs',
		sm: 'loading-xs',
		md: 'loading-sm',
		lg: 'loading-md'
	};

	const cls = $derived(
		['btn', VARIANT[variant], SIZE[size], circle ? 'btn-circle' : 'btn-square', klass]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#snippet content()}
	{#if loading}
		<span class="loading loading-spinner {SPINNER[size]}"></span>
	{:else}
		<Icon class={ICON_SIZE[size]} />
	{/if}
{/snippet}

{#if href}
	<a {href} class={cls} aria-label={label} title={label} {...rest}>
		{@render content()}
	</a>
{:else}
	<button
		{type}
		class={cls}
		aria-label={label}
		title={label}
		disabled={disabled || loading}
		{onclick}
		{...rest}
	>
		{@render content()}
	</button>
{/if}
