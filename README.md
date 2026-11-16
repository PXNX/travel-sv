# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

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

## Working on the UI locally

The authenticated screens need OAuth and Postgres. To review them without
either, run `bun run dev` and open `/preview` — it renders every screen with
sample data. Its "Install hint" button simulates the browser install prompt.

Quality checks: `bun lint` (prettier + eslint), `bun fmt` (format), `bun run test`
and `bun run build`.
