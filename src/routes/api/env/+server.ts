import { json } from '@sveltejs/kit';

// Some deployment probes and browser tooling ask /api/env for a health signal.
// Answer with public, non-secret information only — never expose server config.
export const GET = () =>
	json({ ok: true, app: 'travel-planner' }, { headers: { 'cache-control': 'no-store' } });
