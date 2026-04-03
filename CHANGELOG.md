# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Demo mode**: **Try demo** signs in as the seeded **coordinator**; **non-production** allows full mutations by default (**`DEMO_READ_ONLY=true`** to force view-only). Production blocks demo writes unless **`DEMO_READ_ONLY=false`**. **Dogs** page: **Plan transport with…** deep-links **New transport** with the dog pre-selected; transports list includes **`dogIds`** to open existing runs per dog.
- **Maps**: Transport detail includes a **Leaflet** route map; **`GET /api/geocode`** uses Nominatim (set **`NOMINATIM_USER_AGENT`** in production).
- **Web UI**: Dark header, warm stone background, Outfit + Fraunces, orange accent, org **team** sidebar on transport detail.
- Repository documentation set: `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, and test documentation per `.cursor/rules`.
- [Vitest](https://vitest.dev) test suite at the repository root (`pnpm test`).
- Restored meaningful TypeScript rules in [`.cursor/rules/typescript.mdc`](.cursor/rules/typescript.mdc).

### Fixed

- API production build output now targets `apps/api/dist` (avoids emitting `.js` next to `src`).

## [0.1.0] — 2026-04-03

### Added

- Phase 0–1 implementation: Fastify + Better Auth API, Vite/React web app, Drizzle schema and migrations, Docker Compose (Postgres + Mailpit), organizations, invitations, transports, dogs, and legs.
