// src/lib/types.ts
export const CATEGORIES = ['food', 'museum', 'nature'] as const;
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
	departureTime?: string; // HH:mm format
	arrivalTime?: string; // HH:mm format
	durationMinutes: number;
	routeName?: string; // e.g., "RE7", "Bus 42"
	notes?: string;
}

export interface TripStop {
	tipId: number;
	order: number;
	customDuration?: number; // Stay duration at location
	notes?: string;
	transport?: TransportSegment; // Transport TO this stop from previous
}

export interface Trip {
	id: string;
	name: string;
	description: string;
	stops: TripStop[];
	startDate?: string; // YYYY-MM-DD
	createdAt: string;
	updatedAt: string;
}

export const categoryInfo: Record<
	Category,
	{ value: Category; label: string; icon: string; color: string }
> = {
	food: {
		value: 'food',
		label: 'Food & Dining',
		icon: '🍽️',
		color: '#ef4444'
	},
	museum: {
		value: 'museum',
		label: 'Museum & Culture',
		icon: '🏛️',
		color: '#8b5cf6'
	},
	nature: {
		value: 'nature',
		label: 'Nature & Outdoors',
		icon: '🌲',
		color: '#10b981'
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
	{ value: TransportMode; label: string; icon: string; color: string }
> = {
	railway: {
		value: 'railway',
		label: 'Train',
		icon: '🚆',
		color: '#3b82f6'
	},
	bus: {
		value: 'bus',
		label: 'Bus',
		icon: '🚌',
		color: '#f59e0b'
	},
	walking: {
		value: 'walking',
		label: 'Walking',
		icon: '🚶',
		color: '#10b981'
	}
};
