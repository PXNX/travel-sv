import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        environment: 'jsdom',
        globals: true,
        alias: {
            $lib: '/src/lib',
            '$app/stores': '/src/lib/__mocks__/stores.ts',
            '$app/state': '/src/lib/__mocks__/state.ts'
        }
    }
});
