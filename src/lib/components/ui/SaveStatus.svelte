<script lang="ts">
	import IconCheck from '~icons/material-symbols/check-rounded';

	interface Props {
		status: 'idle' | 'saving' | 'saved';
	}

	let { status }: Props = $props();
</script>

<!-- Fixed width keeps the header from reflowing as the label changes. -->
<span class="flex w-16 shrink-0 items-center justify-end gap-1 text-xs" aria-live="polite">
	{#if status === 'saving'}
		<span class="loading loading-spinner loading-xs text-base-content/40"></span>
		<span class="text-base-content/50">Saving</span>
	{:else if status === 'saved'}
		<span class="text-success animate-fade-in flex items-center gap-0.5">
			<IconCheck class="size-3.5" />
			Saved
		</span>
	{/if}
</span>
