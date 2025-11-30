// src/lib/types.ts
export const CATEGORIES = ['food', 'museum', 'nature'] as const;
export type Category = (typeof CATEGORIES)[number];

export const BEST_TIMES = ['morning', 'afternoon', 'evening', 'any'] as const;
export type BestTime = (typeof BEST_TIMES)[number];

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

export interface Trip {
	id: string;
	name: string;
	description: string;
	stops: TripStop[];
	createdAt: string;
	updatedAt: string;
}

export interface TripStop {
	tipId: number;
	order: number;
	customDuration?: number;
	notes: string;
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
