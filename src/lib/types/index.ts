// src/lib/types.ts
export const CATEGORIES = ['food', 'museum', 'nature', 'leisure'] as const;
export type Category = (typeof CATEGORIES)[number];

export const BEST_TIMES = ['morning', 'afternoon', 'evening', 'any'] as const;
export type BestTime = (typeof BEST_TIMES)[number];

export const TRANSPORT_MODES = ['railway', 'bus', 'walking'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export interface TravelTip {
	id: number;
	title: string;
	description: string;
	latitude: number;
	longitude: number;
	address?: string;
	category: Category;
	durationMinutes: number;
	bestTimeToVisit?: BestTime;
	googleMapsUrl?: string;
	tags?: string[];
	imageUrl?: string;
	userId: string;
	userName: string;
	likes: number;
	createdAt: string;
	updatedAt: string;
}

export interface TransportSegment {
	mode: TransportMode;
	departureTime?: string;
	arrivalTime?: string;
	durationMinutes: number;
	routeName?: string;
	notes?: string;
	distanceKm?: number; // Add distance in kilometers
}

export interface TripStop {
	tipId: number;
	order: number;
	customDuration?: number;
	notes?: string;
	transport?: TransportSegment;
}

export interface Trip {
	id: string;
	name: string;
	description: string;
	stops: TripStop[];
	startDate?: string;
	createdAt: string;
	updatedAt: string;
}

export const categoryInfo: Record<Category, { value: Category; label: string; color: string }> = {
	food: {
		value: 'food',
		label: 'Food & Dining',
		color: '#f59e0b' // amber
	},
	museum: {
		value: 'museum',
		label: 'Museum & Culture',
		color: '#8b5cf6' // purple
	},
	leisure: {
		value: 'leisure',
		label: 'Sleep & Leisure',
		color: '#3b82f6' // blue
	},
	nature: {
		value: 'nature',
		label: 'Nature & Outdoors',
		color: '#10b981' // green
	}
};

export const bestTimeInfo: Record<BestTime, { value: BestTime; label: string }> = {
	morning: { value: 'morning', label: 'Morning' },
	afternoon: { value: 'afternoon', label: 'Afternoon' },
	evening: { value: 'evening', label: 'Evening' },
	any: { value: 'any', label: 'Anytime' }
};

export const transportInfo: Record<
	TransportMode,
	{ value: TransportMode; label: string; color: string }
> = {
	railway: {
		value: 'railway',
		label: 'Train',
		color: '#3b82f6' // blue
	},
	bus: {
		value: 'bus',
		label: 'Bus',
		color: '#f59e0b' // amber
	},
	walking: {
		value: 'walking',
		label: 'Walking',
		color: '#10b981' // green
	}
};
