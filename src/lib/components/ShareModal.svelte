<script lang="ts">
	interface Props {
		open: boolean;
		journeyId: number;
		isPublic: boolean;
		shareUrl?: string | null;
		onpublish?: () => void;
		onunpublish?: () => void;
		onclose?: () => void;
	}

	let { open = $bindable(false), journeyId, isPublic, shareUrl = null, onpublish, onunpublish, onclose }: Props = $props();

	let copied = $state(false);

	async function copyLink() {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
		<div class="bg-base-100 w-full max-w-sm rounded-xl p-6 shadow-xl">
			<h3 class="mb-4 text-lg font-bold">Share Journey</h3>

			<div class="form-control mb-4">
				<label class="label cursor-pointer">
					<span class="label-text">Published</span>
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={isPublic}
						onchange={() => (isPublic ? onunpublish?.() : onpublish?.())}
					/>
				</label>
			</div>

			{#if isPublic && shareUrl}
				<div class="flex items-center gap-2">
					<input
						class="input input-bordered input-sm flex-1 text-xs"
						value={shareUrl}
						readonly
					/>
					<button class="btn btn-primary btn-sm" onclick={copyLink}>
						{copied ? '✓ Copied' : 'Copy'}
					</button>
				</div>
			{:else if !isPublic}
				<p class="text-sm text-base-content/60">Toggle to publish and generate a share link.</p>
			{/if}

			<div class="mt-4 flex justify-end">
				<button class="btn btn-ghost btn-sm" onclick={() => { open = false; onclose?.(); }}>Close</button>
			</div>
		</div>
	</div>
{/if}
