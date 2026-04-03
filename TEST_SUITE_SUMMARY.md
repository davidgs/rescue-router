# Test suite summary

Tests run from the **repository root** with:

```bash
pnpm test
```

Runner: **Vitest** ([`vitest.config.ts`](vitest.config.ts)).

## Coverage by area

| Area | File(s) | What is verified |
|------|---------|------------------|
| Shared DTOs | [`packages/shared/src/schemas.test.ts`](packages/shared/src/schemas.test.ts) | Zod schemas accept valid payloads and reject invalid ones (orgs, invitations, dogs, redeem token). Demo constants in [`demoSeed`](packages/shared/src/index.ts) are not exercised by automation; run `pnpm demo:seed` manually to verify. |
| Database schema | [`packages/db/src/schema.tables.test.ts`](packages/db/src/schema.tables.test.ts) | Core Drizzle table objects are defined (smoke / import integrity). |
| API | [`apps/api/src/app-meta.test.ts`](apps/api/src/app-meta.test.ts) | Lightweight smoke check in the API package context (placeholder until HTTP integration tests land). |
| Web | [`apps/web/src/app-meta.test.ts`](apps/web/src/app-meta.test.ts) | Placeholder until component or E2E tests are added. |

## Planned improvements

- HTTP integration tests for `GET /healthz`, `GET /readyz`, and a minimal authenticated flow (requires app factory or test server helper).
- Browser tests (e.g. Playwright) for critical coordinator and driver flows.

When you add or change behavior covered by tests, update this summary and **[`CHANGELOG.md`](CHANGELOG.md)**.
