<script lang="ts">
	type Tone = 'primary' | 'secondary' | 'accent' | 'neutral';

	interface Props {
		value: string | number;
		label: string;
		tone?: Tone;
		icon?: import('svelte').Component<{ class?: string }>;
		delay?: number;
	}

	let { value, label, tone = 'primary', icon: Icon, delay = 0 }: Props = $props();

	const TONE: Record<Tone, string> = {
		primary: 'text-[#1b2b3a]',
		secondary: 'text-[#a24e2c]',
		accent: 'text-[#a86d15]',
		neutral: 'text-[#1b2b3a]'
	};

	const valueSize = $derived(String(value).length <= 4 ? 'text-2xl' : 'text-lg');
</script>

<div
	class="animate-soft-pop relative bg-[#fffdf7]/80 p-3.5 text-center"
	style={delay ? `animation-delay: ${delay}ms` : ''}
>
	<span class="paper-rule-drawn animate-draw-line absolute top-0 right-3 left-3 h-px"></span>
	{#if Icon}
		<span
			class="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center border border-[#1b2b3a]/20 bg-[#f4ecdc] text-[#a24e2c]"
		>
			<Icon class="h-4 w-4" />
		</span>
	{/if}
	<div class="travel-display {valueSize} tabular-nums {TONE[tone]}">{value}</div>
	<div class="paper-eyebrow mt-0.5 text-[10px]">{label}</div>
</div>
