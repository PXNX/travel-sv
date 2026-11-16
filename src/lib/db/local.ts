// Route Ledger: local-first journey snapshots with an explicit, user-controlled cloud sync.
import type { Journey, Segment, Stop } from '$lib/types';

const DB_NAME = 'journey-planner';
const DB_VERSION = 2;

export interface LocalJourneySnapshot {
	journey: Journey;
	stops: Stop[];
	segments: Segment[];
}

interface LocalJourneyDraft {
	id: number;
	snapshot: LocalJourneySnapshot;
	baseUpdatedAt: string | null;
	updatedAt: number;
}

interface LocalDB {
	journeys_cache: { id: number; data: unknown; updatedAt: number };
	journey_drafts: LocalJourneyDraft;
	journey_list: { userId: string; data: unknown; updatedAt: number };
	nominatim_cache: { query: string; data: unknown; updatedAt: number };
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains('journeys_cache')) {
				db.createObjectStore('journeys_cache', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('journey_drafts')) {
				db.createObjectStore('journey_drafts', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('journey_list')) {
				db.createObjectStore('journey_list', { keyPath: 'userId' });
			}
			if (!db.objectStoreNames.contains('nominatim_cache')) {
				db.createObjectStore('nominatim_cache', { keyPath: 'query' });
			}
		};
	});
}

async function put(storeName: keyof LocalDB, value: unknown): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readwrite');
	// Structured cloning cannot store Svelte's reactive proxies. Serializing here
	// keeps every caller safe, including cached journeys passed straight from $state.
	const durable = value === undefined ? null : (JSON.parse(JSON.stringify(value)) as unknown);
	tx.objectStore(storeName).put(durable);
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function get(storeName: keyof LocalDB, key: IDBValidKey): Promise<unknown | null> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readonly');
	const request = tx.objectStore(storeName).get(key);
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () => reject(request.error);
	});
}

export async function cacheJourneyList(userId: string, data: unknown): Promise<void> {
	return put('journey_list', { userId, data, updatedAt: Date.now() });
}

export async function getCachedJourneyList(userId: string): Promise<unknown | null> {
	return ((await get('journey_list', userId)) as LocalDB['journey_list'] | null)?.data ?? null;
}

export async function cacheJourney(id: number, data: unknown): Promise<void> {
	return put('journeys_cache', { id, data, updatedAt: Date.now() });
}

export async function getCachedJourney(id: number): Promise<unknown | null> {
	return ((await get('journeys_cache', id)) as LocalDB['journeys_cache'] | null)?.data ?? null;
}

export async function saveLocalJourneyDraft(
	id: number,
	snapshot: LocalJourneySnapshot,
	baseUpdatedAt: string | null
): Promise<void> {
	return put('journey_drafts', { id, snapshot, baseUpdatedAt, updatedAt: Date.now() });
}

export async function getLocalJourneyDraft(id: number): Promise<LocalJourneyDraft | null> {
	return get('journey_drafts', id) as Promise<LocalJourneyDraft | null>;
}

export async function clearLocalJourneyDraft(id: number): Promise<void> {
	const db = await openDB();
	const tx = db.transaction('journey_drafts', 'readwrite');
	tx.objectStore('journey_drafts').delete(id);
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

const NOMINATIM_TTL = 5 * 60 * 1000;

export async function cacheNominatimResults(query: string, data: unknown): Promise<void> {
	return put('nominatim_cache', { query: query.toLowerCase(), data, updatedAt: Date.now() });
}

export async function getCachedNominatimResults(query: string): Promise<unknown | null> {
	const result = (await get('nominatim_cache', query.toLowerCase())) as
		LocalDB['nominatim_cache'] | null;
	if (!result || Date.now() - result.updatedAt > NOMINATIM_TTL) return null;
	return result.data;
}
