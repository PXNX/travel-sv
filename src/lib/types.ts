export type Category =
    | 'sleeping'
    | 'food'
    | 'transport'
    | 'leisure'
    | 'shopping'
    | 'nature'
    | 'culture'
    | 'nightlife'
    | 'wellness';

export interface TravelTip {
    id: number;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string | null;
    category: Category | string;
    durationMinutes: number;
    bestTimeToVisit?: string | null;
    googleMapsUrl?: string | null;
    tags?: string[];
    imageUrl?: string | null;
    userId: string;
    userName: string | null;
    likes: number;
    createdAt: string;
    updatedAt: string;
}

export interface TransportSegment {
    type: 'walk' | 'transit' | 'drive';
    durationMinutes: number;
    distanceKm?: number;
    details?: string;
    departureTime?: string;
    arrivalTime?: string;
}

export interface TripStop {
    tipId: number;
    order: number;
    notes: string;
    customDuration?: number;
    transport?: TransportSegment;
}

export interface Trip {
    id: string;
    name: string;
    description?: string;
    stops: TripStop[];
    startDate?: string;
    createdAt: string;
    updatedAt: string;
}

// Journey types (new data model)
export interface Journey {
    id: number;
    ownerId: string;
    title: string;
    description?: string | null;
    isPublic: boolean;
    shareToken?: string | null;
    startDatetime?: Date | string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Stop {
    id: number;
    journeyId: number;
    name: string;
    lat: number;
    lon: number;
    orderIndex: number;
    stayDurationMinutes?: number | null;
    notes?: string | null;
}

export type SegmentMode = 'walk' | 'transit' | 'drive';

export interface TransitLeg {
    type: 'walking' | 'transport';
    lineName?: string;
    product?: string;
    direction?: string;
    departure?: string;
    arrival?: string;
    departureStation?: string;
    arrivalStation?: string;
    durationMinutes: number;
    platform?: string;
}

export interface Segment {
    id: number;
    journeyId: number;
    fromStopId: number;
    toStopId: number;
    distanceM?: number | null;
    elevationUpM?: number | null;
    elevationDownM?: number | null;
    travelDurationMinutes?: number | null;
    mode: SegmentMode;
    transitSummary?: string | null;
    transitLegs?: TransitLeg[] | null;
    walkToStationMin?: number | null;
    walkFromStationMin?: number | null;
    transfers?: number | null;
    walkGeometry?: [number, number][] | null;
    driveGeometry?: [number, number][] | null;
}

export interface JourneyWithDerived extends Journey {
    firstStopName?: string | null;
    lastStopName?: string | null;
    stopCount: number;
    totalDurationMinutes: number;
}
