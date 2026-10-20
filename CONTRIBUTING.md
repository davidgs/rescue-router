# Contributing

Thank you for helping improve Rescue Router.

## Getting started

1. **Clone** the repository and install dependencies:

   ```bash
   yarn install
   ```

2. **Environment**: copy [`.env.example`](.env.example) to `.env` and adjust values.
   - Include `VITE_GOOGLE_MAPS_API_KEY` for map rendering in the web app.

3. **Databases**: start Postgres and Mailpit:

   ```bash
   docker compose up -d
   ```

4. **Migrations**:

   ```bash
   yarn db:migrate
   ```

5. **Run** the stack: `yarn dev` (API + web), then open [http://localhost:5173](http://localhost:5173).

## Project layout

- [`apps/web`](apps/web) — React SPA; static files (favicon, **`public/logo.png`**, etc.) in [`apps/web/public`](apps/web/public).
- [`apps/api`](apps/api) — HTTP API and Better Auth.
- [`packages/db`](packages/db) — Drizzle schema and SQL migrations.
- [`packages/shared`](packages/shared) — Zod schemas and shared types.

## Workflow

- Prefer **small, focused** changes with a clear commit message.
- Update **[`CHANGELOG.md`](CHANGELOG.md)** under `[Unreleased]` for user-visible or operational changes.
- Run **`yarn test`** before opening a PR.
- Follow **[`.cursor/rules/typescript.mdc`](.cursor/rules/typescript.mdc)** for TypeScript conventions.

## Tests

See **[`TEST_SUITE_SUMMARY.md`](TEST_SUITE_SUMMARY.md)** for what is covered. From the repository root:

```bash
yarn test
```

## Demo data

With `ALLOW_DEMO_SEED=true` in `.env`, you can load sample users and a transport:

```bash
yarn demo:seed
```

Use **`yarn demo:seed -- --force`** to drop the demo organization and run a fresh seed (see [README.md](README.md)).

## Security

See **[`SECURITY.md`](SECURITY.md)** for reporting vulnerabilities.
