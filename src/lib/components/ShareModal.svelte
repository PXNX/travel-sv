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
	<label class="bg-base-200 flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3">
		<div class="flex flex-col">
			<span class="text-sm font-medium">Public</span>
			<span class="text-base-content/40 text-xs">Anyone with the link can view</span>
		</div>
		<input
			type="checkbox"
			class="toggle toggle-primary"
			checked={isPublic}
			onchange={() => (isPublic ? onunpublish?.() : onpublish?.())}
		/>
	</label>

	{#if isPublic && shareUrl}
		<div class="bg-base-200 mt-4 rounded-xl p-3">
			<div class="text-base-content/40 mb-1.5 text-xs">Share link</div>
			<div class="text-base-content/70 font-mono text-xs break-all select-all">{shareUrl}</div>
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
			<IconLock class="text-base-content/30 size-8" />
			<p class="text-base-content/50 text-sm">Toggle public to generate a share link.</p>
		</div>
	{/if}
</Modal>
