<script lang="ts">
	import { Button, Modal } from '$lib/components/ui';
	import IconShare from '~icons/material-symbols/share-outline';
	import IconCheck from '~icons/material-symbols/check-rounded';
	import IconLock from '~icons/material-symbols/lock-outline';

	interface Props {
		open: boolean;
		journeyTitle?: string;
		isPublic: boolean;
		shareUrl?: string | null;
		onpublish?: () => void;
		onunpublish?: () => void;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		journeyTitle = 'My Journey',
		isPublic,
		shareUrl = null,
		onpublish,
		onunpublish,
		onclose
	}: Props = $props();

	let shared = $state(false);
	let canNativeShare = $state(false);

	$effect(() => {
		if (open) {
			canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
		}
	});

	function flashShared() {
		shared = true;
		setTimeout(() => (shared = false), 2000);
	}

	async function fallbackCopy() {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		flashShared();
	}

	async function shareLink() {
		if (!shareUrl) return;

		if (canNativeShare) {
			try {
				await navigator.share({
					title: journeyTitle,
					text: `Check out my journey: ${journeyTitle}`,
					url: shareUrl
				});
				flashShared();
			} catch (e: unknown) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				await fallbackCopy();
			}
		} else {
			await fallbackCopy();
		}
	}
</script>

<Modal bind:open title="Share Journey" size="sm" {onclose}>
	<label class="flex cursor-pointer items-center justify-between gap-4 border border-[#172a45]/25 bg-[#f4eee0] px-4 py-3">
		<div class="flex flex-col">
			<span class="text-sm font-semibold text-[#172a45]">Public</span>
			<span class="text-[11px] text-[#172a45]/45">Anyone with the link can view</span>
		</div>
		<input
			type="checkbox"
			class="toggle toggle-primary"
			checked={isPublic}
			onchange={() => (isPublic ? onunpublish?.() : onpublish?.())}
		/>
	</label>

	{#if isPublic && shareUrl}
		<div class="mt-4 border border-[#172a45]/25 bg-[#f4eee0] p-3">
			<div class="travel-eyebrow mb-1.5 text-[9px]">Share link</div>
			<div class="text-xs break-all text-[#172a45]/70 select-all">{shareUrl}</div>
		</div>

		<Button
			class="mt-4"
			block
			icon={shared ? IconCheck : IconShare}
			onclick={shareLink}
		>
			{#if shared}
				{canNativeShare ? 'Shared!' : 'Copied!'}
			{:else}
				Share
			{/if}
		</Button>
	{:else if !isPublic}
		<div class="flex flex-col items-center gap-2 py-6 text-center">
			<IconLock class="text-[#a45e38]/50 size-8" />
			<p class="text-sm text-[#172a45]/55">Toggle public to generate a share link.</p>
		</div>
	{/if}
</Modal>
