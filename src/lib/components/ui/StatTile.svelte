<script lang="ts">
	// Papier & Tinte: small printed folio statistics with restrained amber separators.
	type Tone = 'primary' | 'secondary' | 'accent' | 'neutral';

	interface Props {
		value: string | number;
		label: string;
		tone?: Tone;
	}

	let { value, label, tone = 'primary' }: Props = $props();

	const TONE: Record<Tone, string> = {
		primary: 'text-primary',
		secondary: 'text-secondary',
		accent: 'text-accent',
		neutral: 'text-base-content'
	};

	// Longer values (formatted durations like "1 d 4 h") need to step down a size
	// so every tile in a row keeps the same height.
	const valueSize = $derived(String(value).length <= 4 ? 'text-2xl' : 'text-lg');
</script>

	<div class="border-l-2 border-[#e6a527] bg-[#fffdf7]/75 p-3 text-center">
		<div class="travel-display {valueSize} tabular-nums {TONE[tone]}">{value}</div>
		<div class="mt-0.5 text-xs font-bold tracking-[0.08em] text-[#a45e38] uppercase">{label}</div>
	</div>
