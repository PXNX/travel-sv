import type { SvelteComponent } from 'svelte';
import IconFoodApple from '~icons/fluent-emoji/fork-and-knife-with-plate';
import IconMuseum from '~icons/fluent-emoji/classical-building';
import IconLeisure from '~icons/fluent-emoji/bed';
import IconNature from '~icons/fluent-emoji/evergreen-tree';
import IconTrain from '~icons/fluent-emoji/locomotive';
import IconBus from '~icons/fluent-emoji/bus';
import IconWalking from '~icons/fluent-emoji/person-walking';

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

export const categoryInfo: Record<
	Category,
	{ value: Category; label: string; color: string; icon: typeof SvelteComponent }
> = {
	food: {
		value: 'food',
		label: 'Food & Dining',
		color: '#f59e0b', // amber
		icon: IconFoodApple
	},
	museum: {
		value: 'museum',
		label: 'Museum & Culture',
		color: '#8b5cf6', // purple
		icon: IconMuseum
	},
	leisure: {
		value: 'leisure',
		label: 'Sleep & Leisure',
		color: '#3b82f6', // blue
		icon: IconLeisure
	},
	nature: {
		value: 'nature',
		label: 'Nature & Outdoors',
		color: '#10b981', // green
		icon: IconNature
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
	{ value: TransportMode; label: string; color: string; icon: typeof SvelteComponent }
> = {
	railway: {
		value: 'railway',
		label: 'Train',
		color: '#3b82f6', // blue
		icon: IconTrain
	},
	bus: {
		value: 'bus',
		label: 'Bus',
		color: '#f59e0b', // amber
		icon: IconBus
	},
	walking: {
		value: 'walking',
		label: 'Walking',
		color: '#10b981', // green
		icon: IconWalking
	}
};
