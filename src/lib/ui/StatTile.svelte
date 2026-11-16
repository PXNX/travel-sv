<script lang="ts">
	// Printed folio statistics: a drawn ink rule, a serif numeral and a rust label.
	type Tone = 'primary' | 'secondary' | 'accent' | 'neutral';

	interface Props {
		value: string | number;
		label: string;
		tone?: Tone;
		/** Stagger the soft pop when several tiles appear together. */
		delay?: number;
	}

	let { value, label, tone = 'primary', delay = 0 }: Props = $props();

	const TONE: Record<Tone, string> = {
		primary: 'text-[#172a45]',
		secondary: 'text-[#a45e38]',
		accent: 'text-[#b0781b]',
		neutral: 'text-[#172a45]'
	};

	const valueSize = $derived(String(value).length <= 4 ? 'text-2xl' : 'text-lg');
</script>

<div
	class="animate-soft-pop relative bg-[#fffdf7]/80 p-3 text-center"
	style={delay ? `animation-delay: ${delay}ms` : ''}
>
	<span class="travel-rule-drawn animate-draw-line absolute top-0 right-3 left-3 h-px"></span>
	<div class="travel-display {valueSize} tabular-nums {TONE[tone]}">{value}</div>
	<div class="travel-eyebrow mt-0.5 text-[10px]">{label}</div>
</div>
