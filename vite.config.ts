import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		Icons({
			compiler: 'svelte',
			autoInstall: true
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Travel SV',
				short_name: 'Travel',
				description: 'A personal travel planner with offline route notes and maps.',
				start_url: '/',
				display: 'standalone',
				background_color: '#efe6d5',
				theme_color: '#172a45',
				icons: [
					{
						src: '/icons/travel-sv.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					},
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			},
			workbox: {
				navigateFallback: '/',
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'travel-osm-tiles',
							expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 * 14 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern:
							/^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'travel-satellite-tiles',
							expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: /^https:\/\/[abc]\.tiles\.openrailwaymap\.org\/standard\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'travel-rail-network-tiles',
							expiration: { maxEntries: 140, maxAgeSeconds: 60 * 60 * 24 * 14 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: /^https:\/\/tile\.memomaps\.de\/tilegen\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'travel-public-transit-tiles',
							expiration: { maxEntries: 140, maxAgeSeconds: 60 * 60 * 24 * 14 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			}
		})
	],

	server: {
		allowedHosts: true,
		port: 3021
	}
});
