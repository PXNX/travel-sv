import type { SegmentMode } from '$lib/types';

/** Line colours for German public transport products, keyed by Öffi product code. */
const TRANSIT_PRODUCT_COLORS: Record<string, string> = {
	S: '#008d4f',
	RE: '#ec1c24',
	RB: '#ec1c24',
	ARV: '#ec1c24',
	MEX: '#ec1c24',
	IRE: '#ec1c24',
	Bus: '#a0158a',
	STR: '#d6a100',
	U: '#2e5ea8'
};

export const TRANSIT_FALLBACK_COLOR = '#3b82f6';

export function transitColor(product?: string): string {
	if (!product) return TRANSIT_FALLBACK_COLOR;
	return TRANSIT_PRODUCT_COLORS[product] ?? TRANSIT_FALLBACK_COLOR;
}

/** Map polyline colours per segment mode. `walking` covers walk legs inside a transit segment. */
export const SEGMENT_MODE_COLORS: Record<string, string> = {
	walk: '#22c55e',
	transit: '#3b82f6',
	drive: '#f59e0b',
	walking: '#94a3b8'
};

/** Tailwind classes used to tint segment chips so a mode reads the same everywhere. */
export const SEGMENT_MODE_STYLES: Record<SegmentMode, { border: string; bg: string; dot: string }> =
	{
		walk: { border: 'border-green-500/40', bg: 'bg-green-500/10', dot: 'bg-green-500' },
		transit: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
		drive: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', dot: 'bg-amber-500' }
	};
