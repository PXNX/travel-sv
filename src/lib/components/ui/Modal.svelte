<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconButton from './IconButton.svelte';
	import { focusTrap, isTopOverlay, registerOverlay, unregisterOverlay } from './overlay';

	type Size = 'xs' | 'sm' | 'md' | 'lg' | 'full';
	type Layer = 'base' | 'raised' | 'top';

	interface Props {
		open: boolean;
		title?: string;
		icon?: Component<{ class?: string }>;
		size?: Size;
		layer?: Layer;
		sheet?: boolean;
		padded?: boolean;
		dismissible?: boolean;
		ariaLabel?: string;
		onclose?: () => void;
		subtitle?: Snippet;
		footer?: Snippet;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		icon: Icon,
		size = 'md',
		layer = 'base',
		sheet = true,
		padded = true,
		dismissible = true,
		ariaLabel,
		onclose,
		subtitle,
		footer,
		children
	}: Props = $props();

	const id = Symbol('modal');
	const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

	const LAYER: Record<Layer, string> = {
		base: 'z-[3000]',
		raised: 'z-[4000]',
		top: 'z-[5000]'
	};
	const SIZE: Record<Size, string> = {
		xs: 'sm:max-w-xs',
		sm: 'sm:max-w-sm',
		md: 'sm:max-w-lg',
		lg: 'sm:max-w-2xl',
		full: 'h-[100dvh] sm:h-auto sm:max-w-lg'
	};

	$effect(() => {
		if (!open) return;
		registerOverlay(id);
		return () => unregisterOverlay(id);
	});

	function close() {
		open = false;
		onclose?.();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!open || !dismissible || event.key !== 'Escape') return;
		if (!isTopOverlay(id)) return;
		event.stopPropagation();
		close();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (dismissible && event.target === event.currentTarget) close();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 flex justify-center bg-[#172a45]/70 backdrop-blur-[2px] {LAYER[
			layer
		]} animate-fade-in {sheet ? 'items-end sm:items-center sm:p-4' : 'items-center p-4'}"
		onclick={handleBackdropClick}
	>
		<div
			class="relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-[#172a45]/60 border-t-4 border-t-[#e6a527] bg-[#fffdf7] shadow-[10px_12px_0_rgba(23,42,69,0.25)] outline-none sm:max-h-[85dvh] {SIZE[
				size
			]} {sheet
				? 'animate-slide-up sm:animate-fade-in-scale'
				: 'animate-fade-in-scale'}"
			role="dialog"
			aria-modal="true"
			aria-label={title ? undefined : ariaLabel}
			aria-labelledby={title ? titleId : undefined}
			tabindex="-1"
			use:focusTrap
		>
			{#if title}
				<header class="flex shrink-0 items-start justify-between gap-3 border-b border-[#172a45]/20 px-5 py-3.5">
					<div class="min-w-0">
						<h2 id={titleId} class="travel-display flex items-center gap-1.5 text-lg leading-tight text-[#172a45]">
							{#if Icon}
								<Icon class="size-5 shrink-0 text-[#a45e38]" />
							{/if}
							{title}
						</h2>
						{#if subtitle}
							<div class="mt-0.5 text-xs text-[#172a45]/55">{@render subtitle()}</div>
						{/if}
					</div>
					{#if dismissible}
						<IconButton icon={IconClose} label="Close" size="sm" class="-mr-1.5 shrink-0" onclick={close} />
					{/if}
				</header>
			{/if}

			<div class="min-h-0 flex-1 overflow-y-auto {padded ? 'px-5 py-4' : ''}">
				{@render children()}
			</div>

			{#if footer}
				<footer class="shrink-0 border-t border-[#172a45]/20 px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
