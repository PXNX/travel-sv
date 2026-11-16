# Travel Planner

A local-first travel planner built with SvelteKit. Plan a trip by choosing a
start and a destination, let the app work out the transit connection, then
refine stops and travel modes in the itinerary editor. Journeys can be published
as read-only links and imported by other travellers.

The interface feels like a **paper map**: warm chart paper, ink rules, route
colours and folded-sheet panels. Motion is deliberately small — drawn route
lines, soft pops, a sparkle when a trip is completed.

## Quick start

Dependencies are installed with [Bun](https://bun.sh):

```bash
bun install
bun run dev
```

The dev server listens on port 3021 by default (`vite.config.ts`). The
authenticated screens need Postgres and Google OAuth credentials — put them in
a local `.env` (git-ignored):

```text
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3021/auth/callback/google
```

The Postgres schema lives in `drizzle/` and can be applied with the scripts in
`scripts/`.

## What you can do

- **Plan first** — pick From and To on the home screen (search or map), set a
  departure time and press _Plan journey_. The server creates the trip and
  computes a transit connection for you.
- **Refine the itinerary** — reorder stops by drag or the arrow buttons, switch
  each leg between walk / transit / drive, edit stay times and notes, and jump
  between stops from the compact timeline at the top.
- **See everything** — the _Routes_ tab plots all planned journeys on one map;
  the _Done_ tab archives completed trips.
- **Share and export** — publish a read-only link, or download the journey as
  JSON from the editor.
- **Work offline** — local drafts and cached maps keep the editor usable
  without a connection, with an explicit upload when you are back online.

## Codebase layout

Code is grouped by feature under `src/lib/`. Route files in `src/routes/` stay
thin — they load data and hand off to those components.

| Path                                     | Responsibility                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/lib/ui/`                            | Design system: buttons, cards, modals, headers, tokens (`theme.ts`), overlay handling |
| `src/lib/journeys/`                      | Planner, route/stop/segment cards, share and transit dialogs                          |
| `src/lib/maps/`                          | Leaflet components — single-route map, location picker, all-routes map; browser-only  |
| `src/lib/app/`                           | Shell navigation, install prompt, offline and cookie banners                          |
| `src/lib/offline/`                       | IndexedDB caching, local journey drafts, local-storage helpers                        |
| `src/lib/server/`                        | Postgres schema and queries, shared journey queries, auth, segment computation        |
| `src/lib/types.ts`, `src/lib/helpers.ts` | Shared domain types and pure helpers                                                  |
| `src/routes/(authorized)/`               | Planner home, editor, route overview, completed archive                               |
| `src/routes/(public)/`                   | Login and shared-journey pages                                                        |
| `src/routes/preview/`                    | Dev-only visual harness for every screen                                              |
| `static/`                                | Icons, web manifest, font, PWA assets                                                 |

Conventions:

- Keep pure logic in `.ts` files with a Vitest test; keep reactive state in
  `.svelte.ts` files so pure modules stay testable.
- Import shared UI from `$lib/ui`, journey components from `$lib/journeys/...`
  and storage from `$lib/offline/local`.
- Leaflet must only load in the browser; map components use dynamic imports and
  are never rendered during SSR.

## Working on the UI

The real screens need OAuth and Postgres. To review them without either, run
`bun run dev` and open `/preview`. It renders the planner, editor, completed
archive, shared view, login, empty state and error page with sample data, and
its "Install hint" button simulates the browser install prompt.

Handy shortcut: press `/` on the planner home to focus the journey search.

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
