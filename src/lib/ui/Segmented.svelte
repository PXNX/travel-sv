<script lang="ts" generics="T extends string">
	import type { Component } from 'svelte';

	interface Option {
		value: T;
		label: string;
		icon?: Component<{ class?: string }>;
	}

	interface Props {
		options: Option[];
		value: T;
		disabled?: boolean;
		ariaLabel?: string;
		onchange?: (value: T) => void;
	}

	let { options, value, disabled = false, ariaLabel, onchange }: Props = $props();
</script>

<div
	class="inline-flex gap-px border border-[#1b2b3a]/30 bg-[#f4ecdc] p-px"
	role="radiogroup"
	aria-label={ariaLabel}
>
	{#each options as option (option.value)}
		{@const selected = option.value === value}
		{@const Icon = option.icon}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			class="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 {selected
				? 'animate-soft-pop bg-[#1b2b3a] text-[#fffdf7]'
				: 'text-[#1b2b3a]/55 hover:bg-[#c98a1f]/15 hover:text-[#1b2b3a]'}"
			{disabled}
			title={option.label}
			onclick={() => onchange?.(option.value)}
		>
			{#if Icon}
				<Icon class="size-3.5" />
			{/if}
			{option.label}
		</button>
	{/each}
</div>
