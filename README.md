# Travel SV — Journey Planner

A local-first travel planner built with SvelteKit. Plan a route of stops, attach
walking, driving or public-transport segments, view it all on an interactive map,
and keep working offline. Journeys can be published as read-only links and
imported by other travellers.

The interface uses a warm "paper and ink" design system: printed route slips,
folio numbers, ink rules and restrained amber wayfinding.

## Quick start

Dependencies are installed with [Bun](https://bun.sh):

```bash
bun install
bun run dev
```

The dev server listens on port 3021 by default (`vite.config.ts`). The database
and Google OAuth credentials are required for the authenticated screens — put
them in a local `.env` (git-ignored):

```text
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3021/auth/callback/google
```

The Postgres schema lives in `drizzle/` and can be applied with the scripts in
`scripts/`.

## Codebase layout

Code is grouped by feature under `src/lib/`. Route files in `src/routes/` stay
thin — they load data and hand off to those components.

| Path                                     | Responsibility                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/ui/`                            | Design system: buttons, cards, modals, headers, tokens (`theme.ts`), overlay handling             |
| `src/lib/journeys/`                      | Journey domain UI: route cards, stop cards, segment chips, share and transit detail dialogs       |
| `src/lib/maps/`                          | Leaflet-based map components (`JourneyMap`, `MiniMap`, `LocationPicker`), loaded client-side only |
| `src/lib/app/`                           | App-shell pieces: install prompt, offline and cookie banners                                      |
| `src/lib/offline/`                       | IndexedDB caching, local journey drafts, local-storage helpers                                    |
| `src/lib/server/`                        | Server-only code: Postgres schema and queries, auth, segment computation                          |
| `src/lib/types.ts`, `src/lib/helpers.ts` | Shared domain types and pure helpers (durations, distances, arrival times)                        |
| `src/routes/(authorized)/`               | Sign-in-required screens: journey register, editor, completed archive                             |
| `src/routes/(public)/`                   | Login and shared-journey pages                                                                    |
| `src/routes/preview/`                    | Dev-only visual harness for every screen                                                          |
| `static/`                                | Icons, web manifest, font, PWA assets                                                             |

Conventions:

- Keep pure logic in `.ts` files with a Vitest test; keep reactive state in
  `.svelte.ts` files so the pure modules stay testable.
- Import shared UI from `$lib/ui`, journey components from `$lib/journeys/...`
  and storage from `$lib/offline/local` — not from the old flat `components/`
  path.
- Leaflet must only load in the browser; map components use dynamic imports and
  are never rendered during SSR.
- Everything runs on the device; no cloud LLM or TTS calls are made.

## Working on the UI

The real screens need OAuth and Postgres. To review them without either, run
`bun run dev` and open `/preview`. It renders the register, editor, completed
archive, shared view, login, empty state and error page with sample data, and
its "Install hint" button simulates the browser install prompt.

## Quality checks

```bash
bun fmt          # format all files (prettier --write)
bun lint         # prettier --check + eslint
bun run check    # svelte-check
bun run test     # vitest
bun run build    # production build
```

Commit rules for agents live in [`agents.md`](./agents.md): commit feature by
feature, use `feat|fix|chore|docs|refactor(<area>)` messages, and leave pushes
to the user.

## Deploying to Vercel

The web app deploys from `main`; the SvelteKit adapter builds it into Vercel's
output format. [`vercel.json`](./vercel.json) pins the Bun commands:

- **Install command:** `bun install --frozen-lockfile`
- **Build command:** `bun run build`
- **Framework preset:** SvelteKit

Set `DATABASE_URL` plus the Google OAuth variables
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) as project
environment variables. Pushing to the deployed branch triggers the build;
no manual deployment step is needed. The service worker and web manifest are
served with `must-revalidate` so PWA updates arrive promptly.
