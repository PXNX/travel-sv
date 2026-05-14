import { writable } from 'svelte/store';

export const page = writable({
    url: new URL('http://localhost:3021'),
    params: {},
    data: {}
});

export const navigating = writable(null);
export const updated = writable(false);
