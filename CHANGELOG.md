# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Maps backend**: transport route map switched to Google Maps JS API (geocoding, road routing, and nearby businesses rendered on Google data), reducing dependency on Nominatim/Overpass rate-limited POI/geocode paths.
- **Route map UX**: coordinators/admins can now click a nearby business marker and apply it as a transfer location between adjacent legs (patches `end` of leg N and `start` of leg N+1, then recalculates route).
- **Route map UX**: clicking native Google POI labels/popups (via `placeId`) now also opens the transfer-location workflow; not limited to custom blue POI markers.
- **Web env loading**: `apps/web/vite.config.ts` now sets `envDir: "../.."` so Vite reads the repo-root `.env` (including `VITE_GOOGLE_MAPS_API_KEY`) when running from the workspace package.
- **Maps**: route map now overlays nearby POIs (gas, restaurants, cafes, groceries, pharmacy, hospitals, vets, charging) from OpenStreetMap/Overpass at zoom 13+, so businesses are visible even when basemap labels are sparse.
- **Maps**: switched Leaflet basemap tiles to **Esri World Street Map** for denser street/POI context in route and location-picker maps.
- **Maps**: route map no longer snaps back to a zoomed-out frame while you pan/zoom; auto-fit now runs only when stop geometry changes.
- **Maps**: route lines now request road-following geometry from OSRM (`/api/route`) with straight-line fallback only when routing fails.
- **Maps**: route map panel is now user-resizable (drag handle) and invalidates Leaflet size on resize; initial fit allows zoom 13+ so POI overlays can appear immediately.
- **Maps/POI fix**: `/api/pois` now coerces querystring bounds to numbers, resolving `400 Expected number, received string` errors that prevented any business markers from rendering.
- **Maps/POI fix**: switched Overpass requests to `application/x-www-form-urlencoded` (`data=` payload), addressing upstream `406` errors that caused POI/business lookups to fail.
- **Maps/POI fix**: replaced Overpass POI sourcing with bounded Nominatim searches (same upstream used by geocoding) to avoid recurring Overpass `406` failures in local dev.
- **Maps/POI reliability**: reduced POI fan-out and added 5-minute server-side cache by rounded bounds to avoid Nominatim `429` rate-limit storms while panning/zooming.
- **Maps/POI client**: coarser bounds bucketing (`0.001` deg), longer POI cache, and disabled focus refetch to reduce repeated upstream calls.
- **Maps/geocoding reliability**: added server-side geocode cache (24h) with stale-on-429 fallback and deduped repeated stop-address geocode requests in the route map, reducing Nominatim rate-limit failures that caused “Some stops could not be placed on the map.”
- **Maps UX**: when POI lookup fails, the route map now shows an inline warning instead of silently showing no business markers.
- **Maps UX**: made the route map resize affordance visible and unclipped so drag-to-resize works consistently.
- **Maps UX**: replaced CSS-native resize with an explicit draggable bottom resize handle for the route map, with live Leaflet size invalidation.
- **Web**: **Branding** uses [`apps/web/public/logo.png`](apps/web/public/logo.png) in the site header and as the **favicon** / **apple-touch-icon** (replaces the “RR” tile and SVG favicon).
- **Web**: theme control is an **icon button** (sun / moon / system) with a **dropdown menu** of the same icon choices instead of a three-option radio strip.
- **`.gitignore`**: broader Node/Yarn/Vite/coverage/cache/OS/editor patterns; `.env.*` ignored with **`!.env.example`** preserved.
- Package manager: **pnpm** → **Yarn Classic** (workspaces + root `yarn.lock`; internal packages use `"*"` ranges so Yarn 1 resolves workspace siblings).

### Added

- **Demo mode**: **Try demo** signs in as the seeded **coordinator**; **non-production** allows full mutations by default (**`DEMO_READ_ONLY=true`** to force view-only). Production blocks demo writes unless **`DEMO_READ_ONLY=false`**. **Dogs** page: **Plan transport with…** deep-links **New transport** with the dog pre-selected; transports list includes **`dogIds`** to open existing runs per dog.
- **Maps**: Transport detail includes a **Leaflet** route map; **`GET /api/geocode`** uses Nominatim (set **`NOMINATIM_USER_AGENT`** in production).
- **Web UI**: Dark header, warm stone background, Outfit + Fraunces, orange accent, org **team** sidebar on transport detail.
- Repository documentation set: `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, and test documentation per `.cursor/rules`.
- [Vitest](https://vitest.dev) test suite at the repository root (`yarn test`).
- Restored meaningful TypeScript rules in [`.cursor/rules/typescript.mdc`](.cursor/rules/typescript.mdc).

### Fixed

- **API/DB diagnostics**: API startup now logs the resolved DB target (`host:port`) and DB package logs the connected target (`host:port/database`) to quickly confirm when web responses come from a different database than expected.
- **DB diagnostics**: `drizzle.config.ts` and `migrate-runner.mjs` now print the resolved `DATABASE_URL` target (`host:port/database`) at startup, making accidental localhost connections obvious.
- **DB env precedence**: DB tooling now loads root `.env` with `override: true`, so stale shell exports (for example `DATABASE_URL=...127.0.0.1...`) do not silently redirect `yarn db:migrate` / `yarn db:studio`.
- **Drizzle Studio/config**: `packages/db/drizzle.config.ts` now loads the repo root `.env`, so `yarn db:studio` and `drizzle-kit` commands use the configured `DATABASE_URL` instead of defaulting to localhost.
- **DB migrations**: `packages/db/migrate-runner.mjs` now loads the repo root `.env` (`../../.env`), so `yarn db:migrate` picks up `DATABASE_URL` correctly instead of failing with `DATABASE_URL is required`.
- **API dev**: declare **`@opentelemetry/api`** on `@rescue-router/api` so Better Auth’s instrumentation can resolve (Yarn Classic does not install optional peers automatically; avoids `ERR_MODULE_NOT_FOUND` when running `yarn dev`).
- API production build output now targets `apps/api/dist` (avoids emitting `.js` next to `src`).

## [0.1.0] — 2026-04-03

### Added

- Phase 0–1 implementation: Fastify + Better Auth API, Vite/React web app, Drizzle schema and migrations, Docker Compose (Postgres + Mailpit), organizations, invitations, transports, dogs, and legs.
