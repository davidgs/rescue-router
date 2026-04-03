# Security

## Supported versions

Security fixes are applied to the default branch (`main` or equivalent). Older tags may not receive backports unless documented in a release.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security problems.

Preferred options:

1. Use **GitHub Security Advisories** for this repository (“Report a vulnerability”), if enabled for the project.
2. Or contact the maintainers privately with a clear description, reproduction steps, and impact.

We aim to acknowledge reports within a few business days.

## Demo / seed endpoints

`pnpm demo:seed` must only be run in trusted local or staging environments. Never set **`ALLOW_DEMO_SEED`** or **`DEMO_MODE`** in production; they allow inserting shared demo users and sample transport data.

**`POST /api/demo/enter`** signs the browser into the shared demo **coordinator** (see `demoReadOnlyViewerEmail` in `@rescue-router/shared`) using **`DEMO_GUEST_PASSWORD`**. It is **allowed when `NODE_ENV` is not `production`** unless you set **`DEMO_ENTER_ENABLED=false`**. In **production**, demo entry is **off** until you set **`DEMO_ENTER_ENABLED=true`** (explicit opt-in). If you expose this on the public internet, use a **long random `DEMO_GUEST_PASSWORD`**, keep **`AUTH_SECRET`** and database credentials private, and expect shared-account abuse.

**Demo mutations:** By default, the demo user’s **POST/PATCH/DELETE** calls are **blocked in production** (`403`, view-only). In **non-production**, the demo coordinator can **mutate** data so evaluators can try the app. Override with **`DEMO_READ_ONLY=true`** (always block) or **`DEMO_READ_ONLY=false`** (always allow, including production—dangerous on a shared DB). The route is rate-limited more strictly than the global API default.

**Important:** Production deployments should always set **`NODE_ENV=production`**. If you forget, demo entry could be left on when `DEMO_ENTER_ENABLED` is unset.

**Geocoding:** Authenticated **`GET /api/geocode`** proxies **forward** search (`q=`) and **reverse** lookup (`lat=` + `lon=`) to [Nominatim](https://nominatim.org/) (OpenStreetMap). Set **`NOMINATIM_USER_AGENT`** to identify your deployment per their [usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Secure configuration

When self-hosting:

- Use a long, random `AUTH_SECRET` (and equivalent Better Auth secret settings).
- Run Postgres on a private network; never commit `.env` or database credentials.
- Terminate TLS at your reverse proxy and restrict CORS origins in production.

See also **[`README.md`](README.md)** production notes.
