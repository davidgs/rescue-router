# Rescue Router

Multi-tenant app for planning relay dog transports (many short driving legs). This repo implements **Phase 0** (auth, orgs, invites) and **Phase 1** (transports, dogs, legs, coordinator + driver UI) per [planning/PHASE_1_PLAN.md](planning/PHASE_1_PLAN.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [CHANGELOG.md](CHANGELOG.md) | Release notes and notable changes. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local dev, layout, and contribution workflow. |
| [SECURITY.md](SECURITY.md) | How to report vulnerabilities. |
| [TEST_SUITE_SUMMARY.md](TEST_SUITE_SUMMARY.md) | What automated tests cover. |
| [LICENSE](LICENSE) | MIT license. |
| [planning/](planning/) | Product vision, roadmap, and phased implementation plan. |

Cursor rules for this repo live under [`.cursor/rules/`](.cursor/rules/).

## Git / GitHub

This repository uses the **`main`** branch. After [creating an empty repo on GitHub](https://github.com/new) (no README/license—this repo already has them), connect and push:

```bash
git remote add origin https://github.com/YOUR_USER/rescue-router.git
git push -u origin main
```

Use SSH if you prefer: `git@github.com:YOUR_USER/rescue-router.git`.

## Prerequisites

- Node 22+ (or 20+)
- [pnpm](https://pnpm.io) 9+
- Docker (for Postgres + Mailpit in dev)

Postgres is mapped to host port **5433** (see `.env.example`) so it does not clash with a local PostgreSQL on 5432.

## Quick start

1. Copy environment file and start databases:

   ```bash
   cp .env.example .env
   docker compose up -d
   ```

2. Install dependencies and run migrations:

   ```bash
   pnpm install
   export $(grep -v '^#' .env | xargs) && pnpm db:generate
   export $(grep -v '^#' .env | xargs) && pnpm db:migrate
   ```

   If `db:generate` creates a new migration (first time), run `db:migrate` again.

3. Start API + web (two terminals or use `pnpm dev` from root):

   ```bash
   # Terminal 1 — loads .env via shell or dotenv; minimal:
   export $(grep -v '^#' .env | xargs) && pnpm dev:api
   # Terminal 2
   pnpm dev:web
   ```

   Or from root with env in your shell:

   ```bash
   set -a && source .env && set +a && pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173). Register, create an organization, invite a driver by email (open [http://localhost:8025](http://localhost:8025) for Mailpit), accept the invite while logged in as that user, then build a transport and assign legs.

### Demo mode (optional)

Pre-seed users, two dogs, and a three-leg **Richmond, VA → Philadelphia, PA** sample transport:

1. Set **`ALLOW_DEMO_SEED=true`** in `.env` (see [`.env.example`](.env.example)).
2. Run migrations, then:

   ```bash
   pnpm demo:seed
   ```

3. To show **Try demo** in the site header (signs into the seeded **coordinator**), run the API with **`NODE_ENV`** not set to **`production`** so demo entry is on by default locally, **or** set **`DEMO_ENTER_ENABLED=true`**. Set **`DEMO_GUEST_PASSWORD`** to the same password as the demo coordinator (optional in development; **required in production**). **Locally**, the demo user can create transports, assign legs, etc. **`DEMO_READ_ONLY=true`** forces a view-only demo everywhere; in **production**, demo mutations are read-only unless you set **`DEMO_READ_ONLY=false`** (see [SECURITY.md](SECURITY.md)).

Re-run with **`pnpm demo:seed -- --force`** to delete the demo organization and insert a fresh dataset (demo users are reused if they already exist). Do **not** enable **`ALLOW_DEMO_SEED`** in production; **`DEMO_ENTER_ENABLED`** on a public site is optional but must be paired with a strong **`DEMO_GUEST_PASSWORD`** and rate limits—see [SECURITY.md](SECURITY.md).

## Architecture

- `apps/web` — Vite + React + TanStack Router/Query; calls `/api` on the same origin (Vite proxy → Fastify).
- `apps/api` — Fastify + Better Auth + REST for orgs, invites, dogs, transports, legs.
- `packages/db` — Drizzle schema + migrations.
- `packages/shared` — Zod DTOs shared with the API (web uses hand-written fetches).

## Happy path (Phase 1)

1. Register user A → create organization (user A is `admin`).
2. Invite user B’s email as `driver`; open Mailpit and accept invite while logged in as B.
3. As A: add dogs, create a transport with time window and optional dogs, add legs, assign a leg to B.
4. As B: open **My legs** and verify the assignment; use **Directions** (Google Maps) from addresses.

## Scripts

- `pnpm dev` — run API and web in parallel.
- `pnpm test` — run the Vitest suite (see [TEST_SUITE_SUMMARY.md](TEST_SUITE_SUMMARY.md)).
- `pnpm demo:seed` — seed demo org, users, dogs, and sample legs (requires `ALLOW_DEMO_SEED=true`).
- `pnpm db:generate` — Drizzle generate migrations (needs `DATABASE_URL`).
- `pnpm db:migrate` — apply migrations.
- `pnpm db:studio` — Drizzle Studio (optional).

## Production notes

Set strong `AUTH_SECRET`, real SMTP, and `AUTH_BASE_URL` / `CLIENT_ORIGIN` to your public web URL. Run migrations as a separate deployment step (see planning doc for Kubernetes-style jobs).
