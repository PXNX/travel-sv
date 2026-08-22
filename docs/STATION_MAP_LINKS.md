# Station map link findings

- `bahnhof.de` serves station maps through station-page slugs, for example `https://www.bahnhof.de/frankfurt-main-hbf/karte`.
- A direct numeric HAFAS/EVA-style path such as `https://www.bahnhof.de/8011160/karte` returns a 404 page.
- HAFAS or European station IDs therefore require a lookup step to resolve the corresponding bahnhof.de station-page slug; they cannot be inserted into the map URL directly. The application forwards these IDs to the official station search rather than synthesizing an unreliable slug.
- The official station search resolves station names to slug pages, for example Berlin Hauptbahnhof to `/berlin-hauptbahnhof`; it does not expose a numeric map URL.
- Entering a numeric HAFAS/EVA-style station ID in the visible official search did not yield an ID-based map route in the tested page state.
