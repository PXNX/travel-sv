// T58 — IndexedDB schema for offline caching

const DB_NAME = 'journey-planner';
const DB_VERSION = 1;

interface LocalDB {
    journeys_cache: { id: number; data: unknown; updatedAt: number };
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
            if (!db.objectStoreNames.contains('journey_list')) {
                db.createObjectStore('journey_list', { keyPath: 'userId' });
            }
            if (!db.objectStoreNames.contains('nominatim_cache')) {
                db.createObjectStore('nominatim_cache', { keyPath: 'query' });
            }
        };
    });
}

export async function cacheJourneyList(userId: string, data: unknown): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('journey_list', 'readwrite');
    tx.objectStore('journey_list').put({ userId, data, updatedAt: Date.now() });
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedJourneyList(userId: string): Promise<unknown | null> {
    const db = await openDB();
    const tx = db.transaction('journey_list', 'readonly');
    const request = tx.objectStore('journey_list').get(userId);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.data ?? null);
        request.onerror = () => reject(request.error);
    });
}

export async function cacheJourney(id: number, data: unknown): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('journeys_cache', 'readwrite');
    tx.objectStore('journeys_cache').put({ id, data, updatedAt: Date.now() });
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedJourney(id: number): Promise<unknown | null> {
    const db = await openDB();
    const tx = db.transaction('journeys_cache', 'readonly');
    const request = tx.objectStore('journeys_cache').get(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.data ?? null);
        request.onerror = () => reject(request.error);
    });
}

const NOMINATIM_TTL = 5 * 60 * 1000; // 5 minutes

export async function cacheNominatimResults(query: string, data: unknown): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('nominatim_cache', 'readwrite');
    tx.objectStore('nominatim_cache').put({ query: query.toLowerCase(), data, updatedAt: Date.now() });
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedNominatimResults(query: string): Promise<unknown | null> {
    const db = await openDB();
    const tx = db.transaction('nominatim_cache', 'readonly');
    const request = tx.objectStore('nominatim_cache').get(query.toLowerCase());
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const result = request.result;
            if (!result) return resolve(null);
            if (Date.now() - result.updatedAt > NOMINATIM_TTL) return resolve(null);
            resolve(result.data);
        };
        request.onerror = () => reject(request.error);
    });
}
