/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const TILE_CACHE = 'map-tiles-v1';
const TILE_LRU_CAP = 500;

const ASSETS = [...build, ...files];

// T05 — Install: cache app shell (cache-first)
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
	);
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE && key !== TILE_CACHE)
					.map((key) => caches.delete(key))
			)
		)
	);
});

// T05 — Fetch handler with strategy per request type
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Map tiles: cache-first with LRU cap
	if (isTileRequest(url)) {
		event.respondWith(handleTileRequest(event.request));
		return;
	}

	// App shell assets: cache-first
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then((cache) =>
				cache.match(url.pathname).then((cached) => cached || fetch(event.request))
			)
		);
		return;
	}

	// Journey data (/api/journeys*): network-first with IndexedDB fallback handled client-side
	// Other navigations/API: network-first with cache fallback
	event.respondWith(networkFirst(event.request));
});

function isTileRequest(url) {
	return (
		url.hostname.includes('tile.openstreetmap.org') ||
		url.hostname.includes('tiles.') ||
		url.pathname.match(/\/\d+\/\d+\/\d+\.png$/)
	);
}

async function handleTileRequest(request) {
	const cache = await caches.open(TILE_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		if (response.ok) {
			await enforceTileLRU(cache);
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('', { status: 408, statusText: 'Offline' });
	}
}

async function enforceTileLRU(cache) {
	const keys = await cache.keys();
	if (keys.length >= TILE_LRU_CAP) {
		const toDelete = keys.length - TILE_LRU_CAP + 1;
		for (let i = 0; i < toDelete; i++) {
			await cache.delete(keys[i]);
		}
	}
}

async function networkFirst(request) {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(request);
		if (response.ok && response.status === 200) {
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw new Error('Offline and no cache available');
	}
}
