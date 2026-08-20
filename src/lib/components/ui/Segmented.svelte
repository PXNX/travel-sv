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
	class="bg-base-100/60 flex gap-0.5 self-start rounded-lg p-0.5"
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
			class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
			class:bg-primary={selected}
			class:text-primary-content={selected}
			class:shadow-sm={selected}
			class:hover:bg-base-300={!selected}
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
