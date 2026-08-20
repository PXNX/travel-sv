<script lang="ts">
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

<div class="bg-base-200/60 rounded-xl p-3 text-center">
	<div class="{valueSize} font-bold tabular-nums {TONE[tone]}">{value}</div>
	<div class="text-base-content/40 mt-0.5 text-xs">{label}</div>
</div>
