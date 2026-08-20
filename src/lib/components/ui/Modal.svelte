<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import IconClose from '~icons/material-symbols/close-rounded';
	import IconButton from './IconButton.svelte';
	import { focusTrap, isTopOverlay, registerOverlay, unregisterOverlay } from './overlay';

	type Size = 'xs' | 'sm' | 'md' | 'lg' | 'full';
	/**
	 * Stacking tiers. Leaflet reserves everything up to ~1000, and a detail modal
	 * can be opened from another modal, so the tiers are kept far apart.
	 */
	type Layer = 'base' | 'raised' | 'top';

	interface Props {
		open: boolean;
		title?: string;
		/** Optional glyph shown next to the title. */
		icon?: Component<{ class?: string }>;
		size?: Size;
		layer?: Layer;
		/** Full-width bottom sheet on phones, centred dialog from `sm` up. */
		sheet?: boolean;
		/** Pad the body. Turn off for edge-to-edge content such as maps. */
		padded?: boolean;
		/** Allow dismissing via backdrop click / Escape. */
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
		// Only a click on the backdrop itself dismisses; clicks inside the panel bubble
		// through here but have a different target.
		if (dismissible && event.target === event.currentTarget) close();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 flex justify-center bg-black/60 backdrop-blur-[2px] {LAYER[
			layer
		]} animate-fade-in {sheet ? 'items-end sm:items-center' : 'items-center p-4'}"
		onclick={handleBackdropClick}
	>
		<div
			class="bg-base-100 relative flex max-h-[92dvh] w-full flex-col overflow-hidden shadow-2xl outline-none sm:max-h-[85dvh] {SIZE[
				size
			]} {sheet
				? 'animate-slide-up rounded-t-2xl sm:animate-fade-in-scale sm:rounded-2xl'
				: 'animate-fade-in-scale rounded-2xl'}"
			role="dialog"
			aria-modal="true"
			aria-label={title ? undefined : ariaLabel}
			aria-labelledby={title ? titleId : undefined}
			tabindex="-1"
			use:focusTrap
		>
			{#if title}
				<header
					class="border-base-300 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3.5"
				>
					<div class="min-w-0">
						<h2 id={titleId} class="flex items-center gap-1.5 text-base leading-tight font-bold">
							{#if Icon}
								<Icon class="size-5 shrink-0" />
							{/if}
							{title}
						</h2>
						{#if subtitle}
							<div class="text-base-content/50 mt-0.5 text-xs">{@render subtitle()}</div>
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
				<footer class="border-base-300 shrink-0 border-t px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
