# Trailroam for Strava

Chrome extension MVP for importing Strava activity data using the user's logged-in browser session, storing it locally, and showing routes on a map.

## Install as unpacked extension

1. Run `npm install` to install dependencies.
2. Run `npm run build && npm run package:extension` to build and prepare the extension.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** (toggle in top-right).
5. Click **Load unpacked** and select the `dist/trailroam-for-strava/browser` directory.

The extension icon will appear in the toolbar. Click it to open the popup, then click **Open TrailRoam** to launch the full app.

## Log in to Strava

Navigate to [strava.com](https://www.strava.com) and log in normally. The extension uses your existing browser session — there is no separate Strava OAuth flow.

## Sync your activities

Click **Sync activities** from any of these locations:

- **Activities page** empty state
- **Map page** empty state
- **Settings page** — Sync activities card
- **Header** — Sync dropdown → Sync new activities or Sync missing routes

This opens `strava.com/dashboard` with a sync parameter. The extension fetches activity metadata and GPS routes directly in the Strava tab and saves them locally.

Already-synced activities are detected during pagination so only new activities are fetched.

## OpenFreeMap default map

The map uses [OpenFreeMap](https://openfreemap.org) as the built-in basemap — no API key is required. MapLibre GL JS renders the map with route lines overlaid. Later basemap providers (MapTiler, Geoapify, Stadia Maps) can be configured in Settings with user-provided API keys stored locally.

## Known limitations

- **MVP beta** — this is an early release. Features are limited and UI may change.
- **No cloud sync** — all data stays in your browser's IndexedDB. Clearing browser data will remove it.
- **No standalone OAuth** — you must be logged into Strava in your browser for sync to work.
- **Large route sets** — rendering hundreds of routes on the map may be slow. Use date and category filters to reduce visible routes.
- **Strava session required** — the extension cannot sync if you are logged out of Strava.

## Development

```bash
npm install
npm start          # Angular dev server
npm run build      # Production build
npm test           # Run tests
npm run check      # Build + package extension
```

## Privacy

Activity and GPS route data is stored only in this browser's IndexedDB. No data is uploaded to Trailroam servers. See the **Privacy & Data** section in the app Settings for more details.
