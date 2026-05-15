<script lang="ts">
	import IconShare from '~icons/material-symbols/share-outline';
	import IconCheck from '~icons/material-symbols/check-rounded';
	import IconLock from '~icons/material-symbols/lock-outline';
	import IconClose from '~icons/material-symbols/close-rounded';

	interface Props {
		open: boolean;
		journeyId: number;
		journeyTitle?: string;
		isPublic: boolean;
		shareUrl?: string | null;
		onpublish?: () => void;
		onunpublish?: () => void;
		onclose?: () => void;
	}

	let { open = $bindable(false), journeyId, journeyTitle = 'My Journey', isPublic, shareUrl = null, onpublish, onunpublish, onclose }: Props = $props();

	let shared = $state(false);
	let canNativeShare = $state(false);

	$effect(() => {
		if (open) {
			canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
		}
	});

	async function shareLink() {
		if (!shareUrl) return;

		if (canNativeShare) {
			try {
				await navigator.share({
					title: journeyTitle,
					text: `Check out my journey: ${journeyTitle}`,
					url: shareUrl
				});
				shared = true;
				setTimeout(() => (shared = false), 2000);
			} catch (e: unknown) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				await fallbackCopy();
			}
		} else {
			await fallbackCopy();
		}
	}

	async function fallbackCopy() {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		shared = true;
		setTimeout(() => (shared = false), 2000);
	}

	function close() {
		open = false;
		onclose?.();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/50 animate-fade-in" role="dialog" aria-modal="true" aria-label="Share journey" tabindex="-1" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-base-100 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 shadow-2xl animate-slide-up"
			onclick={(e) => e.stopPropagation()} onkeydown={() => {}}
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-bold">Share Journey</h3>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={close}>
					<IconClose class="h-5 w-5" />
				</button>
			</div>

			<div class="form-control mb-4">
				<label class="label cursor-pointer rounded-xl bg-base-200 px-4 py-3">
					<div class="flex flex-col">
						<span class="text-sm font-medium">Public</span>
						<span class="text-xs text-base-content/40">Anyone with the link can view</span>
					</div>
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={isPublic}
						onchange={() => (isPublic ? onunpublish?.() : onpublish?.())}
					/>
				</label>
			</div>

			{#if isPublic && shareUrl}
				<div class="rounded-xl bg-base-200 p-3 mb-4">
					<div class="text-xs text-base-content/40 mb-1.5">Share link</div>
					<div class="font-mono text-xs text-base-content/70 break-all select-all">{shareUrl}</div>
				</div>

				<button class="btn btn-primary w-full gap-2" onclick={shareLink}>
					{#if shared}
						<IconCheck class="h-5 w-5" />
						{canNativeShare ? 'Shared!' : 'Copied!'}
					{:else}
						<IconShare class="h-5 w-5" />
						Share
					{/if}
				</button>
			{:else if !isPublic}
				<div class="flex flex-col items-center gap-2 py-4 text-center">
					<IconLock class="h-8 w-8 text-base-content/30" />
					<p class="text-sm text-base-content/50">Toggle public to generate a share link.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
