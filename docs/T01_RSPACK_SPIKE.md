# T01 — Rspack / Rsbuild Spike

## Result: **Blocked — staying with Vite**

## Investigation

SvelteKit is tightly coupled to Vite through:
- `@sveltejs/vite-plugin-svelte` — Svelte compilation
- `@sveltejs/kit/vite` — routing, SSR, service workers, adapters
- Vite-specific plugin ecosystem (`@tailwindcss/vite`, `@vite-pwa/sveltekit`, `unplugin-icons/vite`)

Rspack/Rsbuild offers `@rsbuild/plugin-svelte` but it only handles basic Svelte compilation — none of SvelteKit's framework features (file-based routing, server routes, hooks, adapters, service workers).

## Blockers
1. No SvelteKit integration for Rspack/Rsbuild exists (official or community)
2. All current Vite plugins would need replacements
3. `@vite-pwa/sveltekit` has no Rspack equivalent
4. Migration would require abandoning SvelteKit entirely

## Decision
Stay with Vite. Re-evaluate if an official `@sveltejs/rsbuild-plugin-svelte` or Rspack adapter is released.
