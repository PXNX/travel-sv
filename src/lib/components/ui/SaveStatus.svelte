<script lang="ts">
	import IconCheck from '~icons/material-symbols/check-rounded';

	interface Props {
		status: 'idle' | 'saving' | 'saved';
	}

	let { status }: Props = $props();
</script>

<span class="flex w-[70px] shrink-0 items-center justify-end gap-1 text-[11px]" aria-live="polite">
	{#if status === 'saving'}
		<span class="loading loading-spinner loading-xs text-[#a45e38]"></span>
		<span class="text-[#172a45]/50">Saving</span>
	{:else if status === 'saved'}
		<span class="animate-soft-pop flex items-center gap-0.5 text-[#2f7d58]">
			<IconCheck class="size-3.5" />
			Saved
		</span>
	{/if}
</span>
