import type { SegmentMode } from '$lib/types';

/** Line colours for German public transport products, keyed by Öffi product code. */
const TRANSIT_PRODUCT_COLORS: Record<string, string> = {
	S: '#008d4f',
	RE: '#6b7280',
	RB: '#6b7280',
	ARV: '#6b7280',
	MEX: '#6b7280',
	IRE: '#6b7280',
	ICE: '#ec1c24',
	IC: '#ec1c24',
	EC: '#ec1c24',
	FLX: '#ec1c24',
	Bus: '#a0158a',
	STR: '#d6a100',
	U: '#2e5ea8'
};

const TRANSIT_PRODUCT_ALIASES: Record<string, string> = {
	SUBWAY: 'U',
	METRO: 'U',
	SUBURBAN: 'S',
	SBAHN: 'S',
	BUS: 'Bus',
	TRAM: 'STR',
	STREETCAR: 'STR',
	HIGHSPEED_RAIL: 'ICE',
	RAIL: 'RB',
	REGIONAL: 'RB',
	REGIONAL_EXPRESS: 'RE'
};

export const TRANSIT_FALLBACK_COLOR = '#3b82f6';

export function transitColor(product?: string): string {
	if (!product) return TRANSIT_FALLBACK_COLOR;
	const key = TRANSIT_PRODUCT_ALIASES[product.toUpperCase()] ?? product;
	return TRANSIT_PRODUCT_COLORS[key] ?? TRANSIT_FALLBACK_COLOR;
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
		walk: { border: 'border-[#2f7d58]/35', bg: 'bg-[#f1f6f1]', dot: 'bg-[#2f7d58]' },
		transit: { border: 'border-[#2e5ea8]/35', bg: 'bg-[#eef3f9]', dot: 'bg-[#2e5ea8]' },
		drive: { border: 'border-[#b0781b]/40', bg: 'bg-[#faf3e6]', dot: 'bg-[#b0781b]' }
	};
