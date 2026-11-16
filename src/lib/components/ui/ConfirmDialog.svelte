<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';

	type Tone = 'error' | 'primary' | 'warning';

	interface Props {
		open: boolean;
		title: string;
		icon?: Component<{ class?: string }>;
		tone?: Tone;
		confirmLabel?: string;
		cancelLabel?: string;
		loading?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		icon: Icon,
		tone = 'primary',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		loading = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	const BUBBLE: Record<Tone, string> = {
		error: 'bg-[#a83a2b]/12 text-[#a83a2b]',
		primary: 'bg-[#e6a527]/18 text-[#172a45]',
		warning: 'bg-[#e6a527]/20 text-[#b0781b]'
	};
	const CONFIRM_VARIANT = { error: 'error', primary: 'primary', warning: 'primary' } as const;

	function cancel() {
		open = false;
		oncancel?.();
	}
</script>

<Modal bind:open {title} size="xs" layer="top" sheet={false} onclose={oncancel} ariaLabel={title}>
	<div class="flex gap-3.5">
		{#if Icon}
			<div class="flex size-10 shrink-0 items-center justify-center border {BUBBLE[tone]}">
				<Icon class="size-5" />
			</div>
		{/if}
		<div class="min-w-0 pt-0.5 text-sm leading-relaxed text-[#172a45]/70">
			{@render children?.()}
		</div>
	</div>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button variant="ghost" size="sm" onclick={cancel}>{cancelLabel}</Button>
			<Button variant={CONFIRM_VARIANT[tone]} size="sm" {loading} onclick={onconfirm}>
				{confirmLabel}
			</Button>
		</div>
	{/snippet}
</Modal>
