<!-- /src/lib/components/Modal.svelte -->
<script lang="ts">
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';

	let {
		open = $bindable(false),
		title = '',
		onBack = null,
		size = 'default',
		children
	}: {
		open: boolean;
		title?: string;
		onBack?: (() => void) | null;
		size?: 'default' | 'small' | 'large';
		children: any;
	} = $props();

	const sizeClasses = {
		small: 'max-w-sm',
		default: 'max-w-lg',
		large: 'max-w-2xl'
	};

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}
</script>

{#if open}
	<div class="modal-open modal z-5003">
		<div class="modal-box {sizeClasses[size]} rounded-lg">
			<!-- Header with back button (optional) and close button -->
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if onBack}
						<button onclick={onBack} class="btn btn-circle btn-ghost btn-sm" aria-label="Go back">
							<IconArrowLeft class="size-5" />
						</button>
					{/if}
					{#if title}
						<h3 class="text-xl font-bold">{title}</h3>
					{/if}
				</div>
				<button onclick={handleClose} class="btn btn-circle btn-ghost btn-sm" aria-label="Close">
					<IconDismiss class="size-5" />
				</button>
			</div>

			<!-- Modal content -->
			<div class="modal-content">
				{@render children()}
			</div>
		</div>
		<div class="modal-backdrop" onclick={handleBackdropClick}></div>
	</div>
{/if}
